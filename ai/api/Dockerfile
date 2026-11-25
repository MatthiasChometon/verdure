# The api is Python standard library only — no dependencies to install.
FROM python:3.12.13-slim-bookworm

# Unbuffered stdout so logs (warmup progress, errors) show up immediately.
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY app.py .
COPY warmup.jpg .
COPY workflows ./workflows

# Non-root. On-demand mode (COMFY_CONTAINER) talks to the Docker socket: grant
# its group to this user with `group_add` in compose, never by running as root.
RUN useradd --system --no-create-home api
USER api

EXPOSE 8000
# Liveness only: /health answers while the process runs, whatever ComfyUI is doing.
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)"]
CMD ["python", "app.py"]
