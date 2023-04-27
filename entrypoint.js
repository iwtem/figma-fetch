const core = require('@actions/core');
const got = require('got');
const { ensureDir, writeFile } = require('fs-extra');
const { join, resolve } = require('path');
const Figma = require('figma-js');
const PQueue = require('p-queue');
const sanitize = require('sanitize-filename');

const FIGMA_TOKEN = core.getInput('FIGMA_TOKEN');
const FIGMA_FILE_URL = core.getInput('FIGMA_FILE_URL');

const options = {
  format: core.getInput('format') || 'svg',
  outputDir: core.getInput('outputDir') || './build/',
  scale: core.getInput('scale') || 1,
  maxFetchSize: core.getInput('maxFetchSize') || 500,
};

if (!FIGMA_TOKEN) {
  throw Error('Cannot find FIGMA_TOKEN in process!');
}

const client = Figma.Client({
  personalAccessToken: FIGMA_TOKEN,
});

// Fail if there's no figma file key
let fileId = null;
if (!fileId) {
  try {
    fileId = FIGMA_FILE_URL.match(/file\/([a-z0-9]+)\//i)[1];
  } catch (e) {
    throw Error('Cannot find FIGMA_FILE_URL key in process!');
  }
}

console.log(`Exporting ${FIGMA_FILE_URL} components`);
client
  .file(fileId)

  .then(({ data }) => {
    console.log('Processing response');
    const components = {};

    function check(c) {
      if (c.type === 'COMPONENT') {
        const { name, id } = c;
        const { description = '', key } = data.components[c.id];
        const { width, height } = c.absoluteBoundingBox;
        const filename = `${sanitize(name).toLowerCase()}.${options.format}`;

        components[id] = {
          name,
          filename,
          id,
          key,
          file: fileId,
          description,
          width,
          height,
        };
      } else if (c.children) {
        // eslint-disable-next-line github/array-foreach
        c.children.forEach(check);
      }
    }

    data.document.children.forEach(check);
    if (Object.values(components).length === 0) {
      throw Error('No components found!');
    }
    console.log(`${Object.values(components).length} components found in the figma file`);
    return components;
  })
  .then(async components => {
    console.log('Getting export urls');
    const getSplitIds = (ids, maxFetchSize) => {
      const splitIds = [];
      let i = 0;
      while (i < ids.length) {
        splitIds.push(ids.slice(i, i + maxFetchSize));
        i += maxFetchSize;
      }
      return splitIds;
    };

    const componentIds = Object.keys(components);
    const splitIds = getSplitIds(componentIds, options.maxFetchSize);

    await Promise.all(
      splitIds.map(ids => {
        return client
          .fileImages(fileId, {
            format: options.format,
            ids: ids,
            scale: options.scale,
          })
          .then(({ data }) => {
            for (const id of Object.keys(data.images)) {
              components[id].image = data.images[id];
            }
          });
      })
    );

    return components;
  })
  .then(components => {
    console.log('Writing data.json file...');
    return ensureDir(join(process.env.GITHUB_WORKSPACE, options.outputDir))
      .then(() =>
        writeFile(resolve(process.env.GITHUB_WORKSPACE, options.outputDir, 'data.json'), JSON.stringify(components), 'utf8')
      )
      .then(() => components);
  })
  .then(components => {
    console.log('Downloading files to output...');
    const contentTypes = {
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
    };
    return queueTasks(
      Object.values(components).map(component => () => {
        return got
          .get(component.image, {
            headers: {
              'Content-Type': contentTypes[options.format],
            },
            encoding: options.format === 'svg' ? 'utf8' : null,
          })
          .then(response => {
            console.log(`Downloaded ${component.filename}`);
            return ensureDir(join(options.outputDir, options.format)).then(() =>
              writeFile(
                join(options.outputDir, options.format, component.filename),
                response.body,
                options.format === 'svg' ? 'utf8' : 'binary'
              )
            );
          });
      })
    );
  })
  .catch(error => {
    core.setFailed(`Error fetching components from Figma: ${error.message}`);
  });

function queueTasks(tasks, options) {
  const queue = new PQueue(Object.assign({ concurrency: 3 }, options));
  for (const task of tasks) {
    queue.add(task);
  }
  queue.start();
  return queue.onIdle();
}
