export type InferPlaceholders<T extends string> =
  T extends `${string}{${infer Placeholder}}${infer Rest}`
    ? Placeholder | InferPlaceholders<Rest>
    : never;

export type DedentOptions = {
  escapeSpecialCharacters?: boolean;
};

/** ref: https://github.com/dmnd/dedent */
export function dedent<T extends string = string>(str: T, options: DedentOptions = {}): T {
  const { escapeSpecialCharacters = false } = options;
  let result: T = str;

  if (escapeSpecialCharacters) {
    // handle escaped newlines, backticks, and interpolation characters
    result = result
      .replace(/\\\n[ \t]*/g, '')
      .replace(/\\`/g, '`')
      .replace(/\\\$/g, '$')
      .replace(/\\\{/g, '{') as T;
  }

  // strip indentation
  const lines = result.split('\n');
  let mindent: null | number = null;
  for (const l of lines) {
    const m = l.match(/^(\s+)\S+/);
    if (m) {
      const indent = m[1].length;
      if (!mindent) {
        // this is the first indented line
        mindent = indent;
      } else {
        mindent = Math.min(mindent, indent);
      }
    }
  }

  if (mindent !== null) {
    const m = mindent; // appease TypeScript
    result = lines
      // https://github.com/typescript-eslint/typescript-eslint/issues/7140
      // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
      .map((l) => (l[0] === ' ' || l[0] === '\t' ? l.slice(m) : l))
      .join('\n') as T;
  }

  // dedent eats leading and trailing whitespace too
  result = result.trim() as T;
  if (escapeSpecialCharacters) {
    // handle escaped newlines at the end to ensure they don't get stripped too
    result = result.replace(/\\n/g, '\n') as T;
  }

  return result;
}

export function inject<T extends string, P extends Record<string, string | undefined>>(
  template: T,
  params: P
): string {
  return template.replace(/{(.*?)}/g, (match, key) => {
    return key in params ? (params[key] as string) : match;
  });
}

export type TemplateOptions = {
  dedent?: boolean;
  dedentOptions?: DedentOptions;
};

export class StringTemplate<
  T extends string = string,
  PH extends string = InferPlaceholders<T>,
  PS extends Record<string, string> = Record<PH, string>,
> {
  private template: T;
  private readonly options: TemplateOptions;

  constructor(template: T, options?: TemplateOptions) {
    this.options = { dedent: true, ...options };
    if (this.options.dedent) {
      this.template = dedent(template, this.options.dedentOptions);
    } else {
      this.template = template;
    }

    this.fill = this.fill.bind(this);
    this.partial = this.partial.bind(this);
    this.concat = this.concat.bind(this);
    this.toString = this.toString.bind(this);
  }

  fill(params: PS): string {
    return inject(this.template, params);
  }

  partial(params: Partial<PS>) {
    this.template = inject(this.template, params) as T;
    return this;
  }

  concat<
    T1 extends string = string,
    PH1 extends string = InferPlaceholders<T1>,
    PS1 extends Record<string, string> = Record<PH1, string>,
  >(template: StringTemplate<T1, PH1, PS1>) {
    return new StringTemplate<string, PH | PH1, PS & PS1>(this.template + template.template);
  }

  toString() {
    return this.template;
  }
}

export function fromString<T extends string = string>(t: T) {
  return new StringTemplate(t);
}

const text1 = `hello, {name}! Welcome to {website}!`;
const text2 = `I'm from {country}!`;
const text3 = `I like {food}!`;

const t1 = fromString(text1);
const t2 = fromString(text2);
const t3 = fromString(text3);
const t4 = t1.concat(t2);
const t5 = t4.concat(t3);

t1.fill({ name: 'world', website: 'google.com' });
t2.fill({ country: 'USA' });
t3.fill({ food: 'pizza' });
t4.fill({ name: 'world', website: 'google', country: 'USA' });
t5.fill({ name: 'world', website: 'google', country: 'USA', food: 'pizza' });
