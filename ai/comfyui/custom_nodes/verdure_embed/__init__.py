"""ComfyUI node: text -> nomic-embed-text-v1.5 embedding (768-dim), loaded and
run natively (no network call) so the semantic-search embeddings flow through a
ComfyUI pipeline with the model living in ComfyUI/models/. The vector is
returned as a JSON string (ComfyUI has no float-vector socket); the api reads it
back from the graph output."""

import json
import os
from functools import lru_cache

MODEL_ID = "nomic-ai/nomic-embed-text-v1.5"


@lru_cache(maxsize=1)
def _model():
    # Cache the weights under the shared ComfyUI model store when available.
    cache = os.environ.get("VERDURE_MODELS_DIR")
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        MODEL_ID, trust_remote_code=True, cache_folder=cache
    )


class VerdureEmbed:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {"text": ("STRING", {"multiline": True, "default": ""})}
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("embedding",)
    FUNCTION = "embed"
    CATEGORY = "verdure"

    def embed(self, text):
        vector = _model().encode(text, normalize_embeddings=True)
        return (json.dumps(vector.tolist()),)


NODE_CLASS_MAPPINGS = {"VerdureEmbed": VerdureEmbed}
NODE_DISPLAY_NAME_MAPPINGS = {"VerdureEmbed": "Verdure Embed (nomic)"}
