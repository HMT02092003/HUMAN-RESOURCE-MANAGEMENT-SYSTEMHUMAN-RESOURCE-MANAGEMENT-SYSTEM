import type { Knex } from 'knex';

// Provide multiple module declaration shapes so various relative import strings
// ("../../knexfile.js", "./../../knexfile.js", or just "knexfile.js") resolve to `any`/typed config.
declare module '../../knexfile.js' {
  const config: {
    development: Knex.Config;
  };

  export default config;
}

declare module './../../knexfile.js' {
  const config: {
    development: Knex.Config;
  };

  export default config;
}

declare module 'knexfile.js' {
  const config: {
    development: Knex.Config;
  };

  export default config;
}

declare module '*knexfile.js' {
  const config: any;
  export default config;
}
