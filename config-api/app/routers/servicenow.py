from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import httpx
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user
from ..services.encryption import get_encryption_service

router = APIRouter(prefix="/servicenow-configs", tags=["ServiceNow Configs"])


@router.get("", response_model=List[schemas.ServiceNowConfigResponse])
def list_servicenow_configs(db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    configs = db.query(orm.ServiceNowConfig).all()
    return configs


@router.get("/{config_id}", response_model=schemas.ServiceNowConfigResponse)
def get_servicenow_config(config_id: int, db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    config = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ServiceNow config not found")
    return config


@router.post("", response_model=schemas.ServiceNowConfigResponse, status_code=status.HTTP_201_CREATED)
def create_servicenow_config(
    config_data: schemas.ServiceNowConfigCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    existing = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.name == config_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Config with this name already exists")

    config = orm.ServiceNowConfig(
        name=config_data.name,
        instance_url=config_data.instance_url,
        username_encrypted=encryption.encrypt(config_data.username),
        password_encrypted=encryption.encrypt(config_data.password),
        default_caller_id=config_data.default_caller_id,
        default_assignment_group=config_data.default_assignment_group,
        default_category=config_data.default_category,
        enabled=config_data.enabled,
        is_default=config_data.is_default
    )

    if config_data.is_default:
        db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.is_default == True).update({"is_default": False})

    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.put("/{config_id}", response_model=schemas.ServiceNowConfigResponse)
def update_servicenow_config(
    config_id: int,
    config_data: schemas.ServiceNowConfigUpdate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    config = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ServiceNow config not found")

    update_data = config_data.model_dump(exclude_unset=True)

    if "username" in update_data:
        config.username_encrypted = encryption.encrypt(update_data.pop("username"))
    if "password" in update_data:
        config.password_encrypted = encryption.encrypt(update_data.pop("password"))

    if "is_default" in update_data and update_data["is_default"]:
        db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id != config_id).update({"is_default": False})

    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return config


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_servicenow_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    config = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ServiceNow config not found")

    db.delete(config)
    db.commit()
    return None


@router.post("/{config_id}/test", response_model=schemas.TestConnectionResponse)
async def test_servicenow_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    config = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="ServiceNow config not found")

    try:
        username = encryption.decrypt(config.username_encrypted)
        password = encryption.decrypt(config.password_encrypted)

        instance_url = config.instance_url.rstrip("/")
        if not instance_url.startswith("http"):
            instance_url = f"https://{instance_url}"

        url = f"{instance_url}/api/now/table/sys_user?sysparm_limit=1"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                auth=(username, password),
                headers={"Accept": "application/json"},
                timeout=15.0
            )

            if response.status_code == 200:
                return schemas.TestConnectionResponse(
                    success=True,
                    message=f"Successfully connected to ServiceNow instance",
                    details={"instance": config.instance_url}
                )
            elif response.status_code == 401:
                return schemas.TestConnectionResponse(
                    success=False,
                    message="Authentication failed - invalid credentials"
                )
            else:
                return schemas.TestConnectionResponse(
                    success=False,
                    message=f"ServiceNow returned status {response.status_code}",
                    details={"error": response.text[:500]}
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
