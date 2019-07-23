'use strict';

const argv = require('minimist')(process.argv.slice(2));
const Lightyear = require('react-lightyear/server');
const ReactDOMServer = require('react-dom/server');
const ssrPrepass = require('react-ssr-prepass');

require('@babel/register')({
  presets: ['@babel/preset-react'],
});
console.log(argv);
const app = require('./benchmarks/' + argv._[0]);

const rendererName = argv.renderer;
const warmup = argv.warmup || 0;
const repeats = argv.repeats || 5;

async function renderReact() {
  return ReactDOMServer.renderToString(app);
}

async function renderPrepass() {
  await ssrPrepass(app);
  return ReactDOMServer.renderToString(app);
}

async function renderLightyear() {
  return await Lightyear.renderToStringAsync(app);
}

const rendererMap = {
  react: renderReact,
  prepass: renderPrepass,
  lightyear: renderLightyear,
};

const render = rendererMap[rendererName];

function registerResult(payload) {
  if (process.send) {
    process.send({
      type: 'REGISTER_BENCHMARK_RESULT',
      payload,
    });
  } else {
    console.log('Result:', payload);
  }
}

async function bench() {
  let total = 0;
  for (let i = 0; i < warmup; i += 1) {
    await render(app);
  }
  for (let i = 0; i < repeats; i += 1) {
    const start = Date.now();
    await render(app);
    total += Date.now() - start;
  }
  const average = total / repeats;

  return average;
}

bench().then(registerResult);
