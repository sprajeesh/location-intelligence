import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the requested locale is supported
  if (!routing.locales.includes(locale as any)) {
    return {
      messages: (await import(`./en.json`)).default,
    };
  }

  return {
    messages: (await import(`./${locale}.json`)).default,
  };
});
