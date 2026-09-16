# syntax=docker/dockerfile:1

# Keep this tag equal to the Playwright version in package.json. The image supplies the
# matching headed Chromium build, its Linux libraries and Xvfb.
FROM mcr.microsoft.com/playwright:v1.62.0-noble

# glibc returns ::1 before 127.0.0.1 for localhost. Vite then listens on IPv6 while Node's
# fetch connects to IPv4, so the preview never answers the waiter. This is the documented
# gai.conf line that prefers IPv4, and both then share 127.0.0.1.
RUN printf '%s\n' 'precedence ::ffff:0:0/96  100' >> /etc/gai.conf

WORKDIR /benchmark

# Dependency layers depend only on manifests. Editing benchmark or app source therefore keeps
# npm ci cached; changing a lockfile invalidates the installation as it should.
COPY package.json package-lock.json ./
COPY dhtmlx/package.json dhtmlx/package-lock.json dhtmlx/.npmrc ./dhtmlx/
COPY bryntum/package.json bryntum/package-lock.json ./bryntum/
COPY devextreme/package.json devextreme/package-lock.json ./devextreme/
COPY kendo/package.json kendo/package-lock.json ./kendo/
COPY syncfusion/package.json syncfusion/package-lock.json ./syncfusion/

# The base image already contains the Chromium build matching the root Playwright lockfile.
# The BuildKit cache avoids downloading unchanged packages again if a lockfile does change.
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
    && npm ci --prefix dhtmlx \
    && npm ci --prefix bryntum \
    && npm ci --prefix devextreme \
    && npm ci --prefix kendo \
    && npm ci --prefix syncfusion

# These are all runtime sources. Repository documents, reports and development metadata do not
# participate in a benchmark run, so the image does not need a catch-all COPY. `apps.json`
# is one of them: the runner and every app's shim read the measured apps from it, so the image
# cannot build an app without it. It sits here rather than beside the manifests above so that
# adding a library does not invalidate the cached installation. `round-apps.json` is beside it
# for the same reason: it selects which of those apps the round measures.
COPY apps.json round-apps.json ./
COPY bench ./bench
COPY shared ./shared
COPY dhtmlx ./dhtmlx
COPY bryntum ./bryntum
COPY devextreme ./devextreme
COPY kendo ./kendo
COPY syncfusion ./syncfusion

RUN npm run check

# The harness launches headed Chromium. xvfb-run creates a fresh 1600x900, 24-bit X display
# for each container invocation and forwards the command supplied to docker run.
ENTRYPOINT ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1600x900x24 -dpi 96 -nolisten tcp"]

# A plain docker run measures the full matrix into raw-results/docker-xvfb/.
CMD ["npm", "run", "bench", "--", "--machine", "docker-xvfb"]
