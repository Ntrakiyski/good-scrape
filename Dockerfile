FROM mcr.microsoft.com/playwright:v1.59.1-noble

ENV BUN_INSTALL=/usr/local/bun
ENV PATH=/usr/local/bun/bin:$PATH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates unzip \
	&& curl -fsSL https://bun.sh/install | bash \
	&& mkdir -p /work \
	&& chown -R pwuser:pwuser /work \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --chown=pwuser:pwuser bin ./bin
COPY --chown=pwuser:pwuser src ./src
COPY --chown=pwuser:pwuser README.md LICENSE ./

USER pwuser
WORKDIR /work
EXPOSE 3000
ENTRYPOINT ["/app/bin/docker-entrypoint"]
