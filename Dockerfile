FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/providers \
    && /opt/providers/bin/pip install --no-cache-dir 'yt-dlp[default]' curl-cffi
WORKDIR /app
COPY --chown=node:node package.json server.mjs catalogue.json ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
COPY --chown=node:node scripts/resolve-provider.py ./scripts/resolve-provider.py
COPY --chown=node:node examples/demo ./examples/demo
RUN mkdir /app/media /app/data && chown node:node /app/media /app/data
ARG YTDLP_UPDATE_REQUIREMENT=""
RUN if [ -n "$YTDLP_UPDATE_REQUIREMENT" ]; then python3 -m venv /opt/youtube-providers && /opt/youtube-providers/bin/pip install --no-cache-dir "$YTDLP_UPDATE_REQUIREMENT" curl-cffi; fi
ARG YOUTUBE_TOKEN_PROVIDER_VERSION=""
RUN if [ -n "$YOUTUBE_TOKEN_PROVIDER_VERSION" ]; then if [ -x /opt/youtube-providers/bin/pip ]; then /opt/youtube-providers/bin/pip install --no-cache-dir "bgutil-ytdlp-pot-provider==$YOUTUBE_TOKEN_PROVIDER_VERSION"; else /opt/providers/bin/pip install --no-cache-dir "bgutil-ytdlp-pot-provider==$YOUTUBE_TOKEN_PROVIDER_VERSION"; fi; fi
USER node
ENV HOST=0.0.0.0 PORT=4173 PROVIDER_PYTHON=/opt/providers/bin/python
EXPOSE 4173
CMD ["node", "server.mjs"]
