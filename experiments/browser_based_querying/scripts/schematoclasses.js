const fs = require('fs');
const path = require('path');
const easygraphqlSchemaParser = require('easygraphql-parser');

const schemaCode = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

const schema = easygraphqlSchemaParser(schemaCode);

const outputPath = path.join(__dirname, 'output');

try {
  fs.mkdirSync(outputPath, { recursive: true });
} catch (_) {
  /* empty */
}

/**
 * @param {string} type
 */
function typeToTSType(type) {
  switch (type) {
    case 'Int':
      return 'number';
    case 'String':
      return 'string';
    default:
      console.log(`Unexpected gql type: ${type}`);
      return null;
  }
}

function makeStartingVertices() {
  const STARTING_VERTICES = 'starting_vertices';
  const dir = path.join(outputPath, STARTING_VERTICES);
  try {
    fs.mkdirSync(dir);
  } catch (_) {
    /* empty */
  }
  const startingVertices = [];

  for (const { name, arguments: argz } of schema.RootSchemaQuery.fields) {
    fs.writeFileSync(
      path.join(dir, name + '.ts'),
      `export function get${name}(${argz
        .map((x) => `${x.name}: ${typeToTSType(x.type)}`)
        .join(', ')}) {\n}`
    );
    startingVertices.push(name);
  }

  for (const startingVertice of startingVertices) {
    fs.appendFileSync(
      path.join(outputPath, 'index.ts'),
      `export * from './${STARTING_VERTICES}/${startingVertice}'\n`
    );
  }
}

function makeTypes() {
  const TYPES = 'types';
  const dir = path.join(outputPath, TYPES);
  try {
    fs.mkdirSync(dir);
  } catch (_) {
    /* empty */
  }

  const types = [];

  for (const [name, { fields, implementedTypes }] of Object.entries(schema).filter(
    (x) => x[1].type
  )) {
    types.push(name);

    fs.writeFileSync(
      path.join(dir, name + '.ts'),
      `import * as t from '../index'\nexport type ${name} = { ${fields
        .map(
          (x) => `${x.name}: ${typeToTSType(x.type) ?? 't.' + x.type}${!x.noNull ? ' | null' : ''}`
        )
        .join(', ')} }${
        implementedTypes.length > 0
          ? ` & ( ${implementedTypes.map((t) => 't.' + t).join(' | ')} )`
          : ''
      }`
    );
  }
  for (const type of types) {
    fs.appendFileSync(path.join(outputPath, 'index.ts'), `export * from './${TYPES}/${type}'\n`);
  }
}

makeStartingVertices();
makeTypes();
