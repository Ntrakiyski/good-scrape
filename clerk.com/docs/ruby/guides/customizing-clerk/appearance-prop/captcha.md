---
title: "captcha prop"
url: "https://clerk.com/docs/ruby/guides/customizing-clerk/appearance-prop/captcha"
---

# captcha prop

The `captcha` property can be used to change the appearance of the CAPTCHA widget.

## Properties

| Name                                                        | Type                                                                                                                                                                                                                                | Description                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| theme                                                       | 'auto' | 'light' | 'dark'                                                                                                                                                                                                         | The CAPTCHA widget theme. Defaults to auto.  |
| size                                                        | 'normal' | 'flexible' | 'compact'                                                                                                                                                                                                 | The CAPTCHA widget size. Defaults to normal. |
| appearance.captcha.language: Set by this language property. | localization.locale: Set by the localization prop on <ClerkProvider>. Some languages are supported by Clerk but not by Cloudflare Turnstile, which is used for the CAPTCHA widget. See Cloudflare Turnstile's supported languages. |                                              |

## Usage

To customize the CAPTCHA widget, pass the `appearance` prop to the [`<ClerkProvider>`](https://clerk.com/docs/reference/components/clerk-provider.md) component. The `appearance` prop accepts the property `captcha`, which can be used to apply different changes to the widget.

In the following example, the CAPTCHA is customized to use the dark theme, a flexible size, and Spanish as the display language.

```tsx {{ mark: [[3, 7]] }}
<ClerkProvider
  appearance={{
    captcha: {
      theme: 'dark',
      size: 'flexible',
      language: 'es-ES',
    },
  }}
>
  {/* ... */}
</ClerkProvider>
```

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)
