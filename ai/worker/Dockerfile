# The worker agent is Python standard library only — no dependencies.
FROM python:3.12.13-slim-bookworm
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY app.py .

# Non-root. /data holds the paired token: created here and owned by the user so
# the named volume mounted on it is writable. No HEALTHCHECK: the worker only
# makes outbound calls and listens on nothing; `restart: unless-stopped` covers a crash.
RUN useradd --system --no-create-home worker \
    && mkdir /data \
    && chown worker /data
USER worker
CMD ["python", "app.py"]
