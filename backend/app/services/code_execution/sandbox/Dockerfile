# One shared sandbox image for every supported language, rather than one
# image per language. Simpler to build/maintain/version, and every run
# gets an identical, fully locked-down container regardless of language,
# since containers are never reused or shared between runs anyway.
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    nodejs \
    default-jdk-headless \
    gcc \
    g++ \
    coreutils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Fixed non-root user every run executes as. The backend's docker_runner.py
# chmods the host-side workspace directory to 0o777 before mounting it, so
# this user (whose uid won't generally match the host's) can still write
# compiled output (main.out, Main.class, etc.) into it.
RUN useradd --create-home --uid 1000 sandbox

USER sandbox
WORKDIR /workspace