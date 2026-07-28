# ComfyUI is the single shared runtime; the models live in ComfyUI/models/
# (a persisted volume) and the pipelines run natively on the GPU — no Ollama.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git
WORKDIR /opt/ComfyUI

RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu124 \
    && pip3 install -r requirements.txt

# Native Qwen2.5-VL (vision) — GGUF runtime via llama-cpp-python (CUDA wheel).
RUN git clone --depth 1 https://github.com/1038lab/ComfyUI-QwenVL.git \
      custom_nodes/ComfyUI-QwenVL \
    && pip3 install -r custom_nodes/ComfyUI-QwenVL/requirements.txt \
    && pip3 install llama-cpp-python \
      --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124

# Native text embeddings (nomic-embed-text-v1.5) for the verdure_embed node.
RUN pip3 install sentence-transformers einops
COPY custom_nodes/verdure_embed custom_nodes/verdure_embed

# Force the CUDA build of torch LAST: the ComfyUI / node requirements above pull
# in CPU / mismatched-CUDA builds that would otherwise leave the GPU unused or
# fail to load (torchaudio ships a cu13 build that can't find libcudart).
RUN pip3 install --no-deps --force-reinstall torch torchvision torchaudio \
      --index-url https://download.pytorch.org/whl/cu124

# Drop triton (bundled with torch, unused here): its startup init tries to
# compile a CUDA kernel with a C compiler absent from the runtime image and
# crashes ComfyUI. Removed, ComfyUI just disables the triton backend and boots.
RUN rm -rf /usr/local/lib/python3.10/dist-packages/triton \
      /usr/local/lib/python3.10/dist-packages/triton-*

EXPOSE 8188
CMD ["python3", "main.py", "--listen", "0.0.0.0", "--port", "8188"]
