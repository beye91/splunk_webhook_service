from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import httpx
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user
from ..services.encryption import get_encryption_service

router = APIRouter(prefix="/llm-providers", tags=["LLM Providers"])


@router.get("", response_model=List[schemas.LLMProviderResponse])
def list_llm_providers(db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    providers = db.query(orm.LLMProvider).all()
    result = []
    for provider in providers:
        response = schemas.LLMProviderResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            openai_model=provider.openai_model,
            ollama_host=provider.ollama_host,
            ollama_port=provider.ollama_port,
            ollama_model=provider.ollama_model,
            max_tokens=provider.max_tokens,
            temperature=provider.temperature,
            enabled=provider.enabled,
            is_default=provider.is_default,
            has_api_key=bool(provider.api_key_encrypted),
            created_at=provider.created_at,
            updated_at=provider.updated_at
        )
        result.append(response)
    return result


@router.get("/{provider_id}", response_model=schemas.LLMProviderResponse)
def get_llm_provider(provider_id: int, db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM Provider not found")

    return schemas.LLMProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        openai_model=provider.openai_model,
        ollama_host=provider.ollama_host,
        ollama_port=provider.ollama_port,
        ollama_model=provider.ollama_model,
        max_tokens=provider.max_tokens,
        temperature=provider.temperature,
        enabled=provider.enabled,
        is_default=provider.is_default,
        has_api_key=bool(provider.api_key_encrypted),
        created_at=provider.created_at,
        updated_at=provider.updated_at
    )


@router.post("", response_model=schemas.LLMProviderResponse, status_code=status.HTTP_201_CREATED)
def create_llm_provider(
    provider_data: schemas.LLMProviderCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    existing = db.query(orm.LLMProvider).filter(orm.LLMProvider.name == provider_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Provider with this name already exists")

    provider = orm.LLMProvider(
        name=provider_data.name,
        provider_type=provider_data.provider_type,
        api_key_encrypted=encryption.encrypt(provider_data.api_key) if provider_data.api_key else None,
        openai_model=provider_data.openai_model,
        ollama_host=provider_data.ollama_host,
        ollama_port=provider_data.ollama_port,
        ollama_model=provider_data.ollama_model,
        max_tokens=provider_data.max_tokens,
        temperature=provider_data.temperature,
        enabled=provider_data.enabled,
        is_default=provider_data.is_default
    )

    if provider_data.is_default:
        db.query(orm.LLMProvider).filter(orm.LLMProvider.is_default == True).update({"is_default": False})

    db.add(provider)
    db.commit()
    db.refresh(provider)

    return schemas.LLMProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        openai_model=provider.openai_model,
        ollama_host=provider.ollama_host,
        ollama_port=provider.ollama_port,
        ollama_model=provider.ollama_model,
        max_tokens=provider.max_tokens,
        temperature=provider.temperature,
        enabled=provider.enabled,
        is_default=provider.is_default,
        has_api_key=bool(provider.api_key_encrypted),
        created_at=provider.created_at,
        updated_at=provider.updated_at
    )


@router.put("/{provider_id}", response_model=schemas.LLMProviderResponse)
def update_llm_provider(
    provider_id: int,
    provider_data: schemas.LLMProviderUpdate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM Provider not found")

    update_data = provider_data.model_dump(exclude_unset=True)

    if "api_key" in update_data:
        api_key = update_data.pop("api_key")
        if api_key:
            provider.api_key_encrypted = encryption.encrypt(api_key)

    if "is_default" in update_data and update_data["is_default"]:
        db.query(orm.LLMProvider).filter(orm.LLMProvider.id != provider_id).update({"is_default": False})

    for key, value in update_data.items():
        setattr(provider, key, value)

    db.commit()
    db.refresh(provider)

    return schemas.LLMProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        openai_model=provider.openai_model,
        ollama_host=provider.ollama_host,
        ollama_port=provider.ollama_port,
        ollama_model=provider.ollama_model,
        max_tokens=provider.max_tokens,
        temperature=provider.temperature,
        enabled=provider.enabled,
        is_default=provider.is_default,
        has_api_key=bool(provider.api_key_encrypted),
        created_at=provider.created_at,
        updated_at=provider.updated_at
    )


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_llm_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM Provider not found")

    db.delete(provider)
    db.commit()
    return None


@router.post("/{provider_id}/test", response_model=schemas.TestConnectionResponse)
async def test_llm_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM Provider not found")

    try:
        if provider.provider_type == "openai":
            if not provider.api_key_encrypted:
                return schemas.TestConnectionResponse(
                    success=False,
                    message="No API key configured"
                )

            api_key = encryption.decrypt(provider.api_key_encrypted)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                if response.status_code == 200:
                    return schemas.TestConnectionResponse(
                        success=True,
                        message="Successfully connected to OpenAI API",
                        details={"model": provider.openai_model}
                    )
                else:
                    return schemas.TestConnectionResponse(
                        success=False,
                        message=f"OpenAI API returned status {response.status_code}",
                        details={"error": response.text}
                    )

        elif provider.provider_type == "ollama":
            host = provider.ollama_host or "localhost"
            port = provider.ollama_port or 11434
            url = f"http://{host}:{port}/api/tags"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return schemas.TestConnectionResponse(
                        success=True,
                        message=f"Successfully connected to Ollama at {host}:{port}",
                        details={"available_models": models}
                    )
                else:
                    return schemas.TestConnectionResponse(
                        success=False,
                        message=f"Ollama returned status {response.status_code}"
                    )

        else:
            return schemas.TestConnectionResponse(
                success=False,
                message=f"Unknown provider type: {provider.provider_type}"
            )

    except httpx.TimeoutException:
        return schemas.TestConnectionResponse(
            success=False,
            message="Connection timeout"
        )
    except httpx.ConnectError as e:
        return schemas.TestConnectionResponse(
            success=False,
            message=f"Connection failed: {str(e)}"
        )
    except Exception as e:
        return schemas.TestConnectionResponse(
            success=False,
            message=f"Error: {str(e)}"
        )
