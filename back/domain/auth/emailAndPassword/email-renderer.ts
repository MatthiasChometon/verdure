import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Injectable } from '@nestjs/common';
import { EmailName, EmailProps, RenderedEmail, RenderFn } from './type';

// The Vue email templates (domain/auth/emails) are compiled by Vite into this
// self-contained CJS bundle (pnpm build:emails).
const BUNDLE = 'domain/auth/emails/dist/render.cjs';

@Injectable()
export class EmailRenderer {
  private cached: RenderFn | undefined = undefined;

  async render(
    name: EmailName,
    props: EmailProps,
    locale: string,
  ): Promise<RenderedEmail> {
    this.cached ??= await this.load();
    return this.cached(name, props, locale);
  }

  private async load(): Promise<RenderFn> {
    const url = pathToFileURL(resolve(process.cwd(), BUNDLE)).href;
    const bundle = (await import(url)) as {
      renderEmail?: RenderFn;
      default?: { renderEmail: RenderFn };
    };
    const render = bundle.renderEmail ?? bundle.default?.renderEmail;
    if (render === undefined) {
      throw new Error(
        'Email templates are not built. Run "pnpm build:emails".',
      );
    }
    return render;
  }
}
