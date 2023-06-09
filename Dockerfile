FROM node:10

LABEL com.github.actions.name="figma-fetch"
LABEL com.github.actions.description="GitHub action for exporting figma components."
LABEL com.github.actions.icon="film"
LABEL com.github.actions.color="purple"

LABEL repository="https://github.com/iwtem/figma-fetch"
LABEL homepage="https://github.com/iwtem/figma-fetch"
LABEL maintainer="iwtem <iwtem@aliyun.com>"

WORKDIR /
COPY . /
RUN yarn install

ENTRYPOINT [ "node", "/entrypoint.js" ]
