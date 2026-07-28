# Multi-language sandboxing image for secure user code execution.
FROM debian:bookworm-slim

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Use explicit shell for safety
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install required language runtimes, compilers, and core utilities minimal build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    nodejs \
    default-jdk-headless \
    gcc \
    g++ \
    coreutils \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create a dedicated, non-privileged system user and group (UID/GID 10000)
# explicitly avoiding host UID collisions.
RUN groupadd -g 10000 sandbox && \
    useradd -u 10000 -g sandbox -m -s /bin/false sandbox

# Create workspace directory owned by sandbox user
WORKDIR /workspace
RUN chown -R sandbox:sandbox /workspace

# Default execution context: unprivileged sandbox user
USER sandbox:sandbox

# Set standard execution working directory
WORKDIR /workspace