import logging
import time
import httpx
from abc import ABC, abstractmethod
from openai import OpenAI
from ollama import Client as OllamaClient
from ..utils.encryption import encryption_service

log = logging.getLogger(__name__)


def is_internal_url(url: str) -> bool:
    """Check if URL points to internal/private IP address"""
    if not url:
        return False
    prefixes = ["10.", "172.16.", "172.17.", "172.18.", "172.19.",
                "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
                "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
                "172.30.", "172.31.", "192.168.", "localhost", "127."]
    return any(url.startswith(f"http://{p}") or url.startswith(f"https://{p}") for p in prefixes)


class LLMProvider(ABC):
    @abstractmethod
    def ask(self, system_prompt: str, user_prompt: str) -> str:
        pass


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini-2024-07-18", max_tokens: int = 1000, temperature: float = 0.7, base_url: str = None):
        # For internal IPs, use custom http_client to bypass proxy
        if base_url and is_internal_url(base_url):
            http_client = httpx.Client(transport=httpx.HTTPTransport())
            self.client = OpenAI(api_key=api_key, base_url=base_url, http_client=http_client)
            log.info(f"Using proxy-bypass client for internal base_url: {base_url}")
        else:
            self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.base_url = base_url

    def ask(self, system_prompt: str, user_prompt: str) -> str:
        if self.base_url:
            log.info(f"Calling OpenAI-compatible API at {self.base_url} with model: {self.model}")
        else:
            log.info(f"Calling OpenAI API with model: {self.model}")
        log.debug(f"System prompt: {system_prompt[:100]}...")
        log.debug(f"User prompt: {user_prompt[:100]}...")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )

        result = response.choices[0].message.content
        log.info(f"OpenAI response received: {len(result)} characters")
        return result


class OllamaProvider(LLMProvider):
    def __init__(self, host: str = "localhost", port: int = 11434, model: str = "llama3.1"):
        self.host = f"http://{host}:{port}"
        self.client = OllamaClient(host=self.host)
        self.model = model

    def ask(self, system_prompt: str, user_prompt: str) -> str:
        log.info(f"Calling Ollama API at {self.host} with model: {self.model}")
        log.debug(f"System prompt: {system_prompt[:100]}...")
        log.debug(f"User prompt: {user_prompt[:100]}...")

        response = self.client.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        result = response["message"]["content"]
        log.info(f"Ollama response received: {len(result)} characters")
        return result


class LLMService:
    def __init__(self):
        pass

    def get_provider(self, provider_config) -> LLMProvider:
        if provider_config.provider_type == "openai":
            api_key = encryption_service.decrypt(provider_config.api_key_encrypted)
            if not api_key:
                raise ValueError("OpenAI API key not configured")

            temperature = float(provider_config.temperature) if provider_config.temperature else 0.7
            return OpenAIProvider(
                api_key=api_key,
                model=provider_config.openai_model or "gpt-4o-mini-2024-07-18",
                max_tokens=provider_config.max_tokens or 1000,
                temperature=temperature,
                base_url=provider_config.openai_base_url
            )

        elif provider_config.provider_type == "ollama":
            host = provider_config.ollama_host or "localhost"
            port = provider_config.ollama_port or 11434
            return OllamaProvider(
                host=host,
                port=port,
                model=provider_config.ollama_model or "llama3.1"
            )

        else:
            raise ValueError(f"Unknown provider type: {provider_config.provider_type}")

    def ask(self, provider_config, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        """
        Ask the LLM and return (response, response_time_ms)
        """
        start_time = time.time()

        provider = self.get_provider(provider_config)
        response = provider.ask(system_prompt, user_prompt)

        response_time_ms = int((time.time() - start_time) * 1000)
        return response, response_time_ms


llm_service = LLMService()
