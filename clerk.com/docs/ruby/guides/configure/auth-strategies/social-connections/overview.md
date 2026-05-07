---
title: "Social connections (OAuth)"
url: "https://clerk.com/docs/ruby/guides/configure/auth-strategies/social-connections/overview"
---

# Social connections (OAuth)

**Before you start**

- [A Clerk application is required.](https://clerk.com/docs/getting-started/quickstart/setup-clerk.md)
- [Follow the quickstart guide.](https://clerk.com/docs/getting-started/quickstart.md)

Social connections, also known as OAuth connections in Clerk, allow users to gain access to your application by using their existing credentials from an Identity Provider (IdP), like Google or Microsoft. For example, if you enable Google as a social provider, then when a user wants to sign in to your application, they can select Google and use their Google account to sign in.

> When using social connections, the sign-up and sign-in flows are equivalent. If a user doesn't have an account and tries to sign in, an account will be made for them, and vice versa.

Configure social connections in the [Clerk Dashboard](https://dashboard.clerk.com/) and use the [Clerk Backend API](https://clerk.com/docs/reference/backend-api) to read connected accounts and fetch OAuth access tokens for signed-in users.

## Enable a social connection

1. In the Clerk Dashboard, navigate to the [**SSO connections**](https://dashboard.clerk.com/~/user-authentication/sso-connections) page.
2. Select the **Add connection** button, and select **For all users**.
3. Select the provider you want to use.
4. Enabling **Enable for sign-up and sign-in** will depend on your use case:
   - If you want to allow users to sign up and sign in using the provider, enable this option.
   - If you want to allow users to link their account with this provider to their Clerk account, but not use it for sign-up or sign-in, disable this option. Users can manage their social connections on their user profile page.
5. Enabling **Use custom credentials** will depend on your instance type:
   - For **development** instances, Clerk uses **pre-configured, shared credentials** to make the setup process as smooth as possible. For most social providers, you can leave this option disabled.
   - For **production** instances, you need to configure the provider with custom OAuth credentials. See the [`list of supported providers`](https://clerk.com/docs/ruby/guides/configure/auth-strategies/social-connections/overview.md#supported-social-providers) for provider-specific setup instructions.
6. Select **Enable connection** when you're ready for the connection to be available to your users.

## Configure additional OAuth scopes

Each OAuth provider requires a specific set of scopes that are necessary for proper authentication with Clerk. **These essential scopes are pre-configured and automatically included by Clerk.** They typically include permissions for basic profile information and email access, which are fundamental for user authentication and account creation.

In addition to the essential scopes, you can specify additional scopes supported by the provider. These scopes can be used to access additional user data from the provider.

To add additional OAuth scopes, when you [`enable a new social connection`](https://clerk.com/docs/ruby/guides/configure/auth-strategies/social-connections/overview.md#enable-a-social-connection), enable **Use custom credentials**. The **Scopes** field will appear.

## Get an OAuth access token for a social provider

You can use a social provider's OAuth access token to access user data from that provider in addition to their data from Clerk.

Use the [`getUserOauthAccessToken()`](https://clerk.com/docs/reference/backend/user/get-user-oauth-access-token.md) method to get the user's OAuth access token. **This method must be used in a server environment, and cannot be run on the client.**

> Clerk does not automatically keep OAuth access tokens fresh behind the scenes. When you request an access token using [the relevant backend API endpoint](https://clerk.com/docs/reference/backend-api/tag/oauth-access-tokens/post/oauth_applications/access_tokens/verify){{ target: '_blank' }}, Clerk will attempt to obtain a fresh access token as well as a new refresh token. However, this process occurs only when you initiate the request; Clerk does not proactively refresh tokens on your behalf.

The following example demonstrates how to retrieve the OAuth access token for a user and use it to fetch user data from the Notion API. It assumes:

- You have already [enabled the Notion social connection in the Clerk Dashboard](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/notion.md).
- The user has already connected their Notion account to your application.
- The user has the correct permissions to access the Notion API.

**If your SDK isn't listed, you can use the comments in the example to help you adapt it to your SDK.**

**Next.js**

```tsx {{ filename: 'app/api/notion/route.tsx' }}
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
  // Accessing the `Auth` object differs depending on the SDK you're using
  // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
  const { isAuthenticated, userId } = await auth()

  // Protect the route from unauthenticated users
  if (!isAuthenticated) {
    return NextResponse.json({ message: 'User not authenticated' }, { status: 401 })
  }

  const provider = 'notion'

  // Initialize clerkClient
  const client = await clerkClient()

  // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
  const clerkResponse = await client.users.getUserOauthAccessToken(userId, provider)
  const accessToken = clerkResponse.data[0]?.token ?? ''
  if (!accessToken) {
    return NextResponse.json({ message: 'Access token not found' }, { status: 401 })
  }

  // Fetch the user data from the Notion API
  // This endpoint fetches a list of users
  // https://developers.notion.com/reference/get-users
  const notionUrl = 'https://api.notion.com/v1/users'

  const notionResponse = await fetch(notionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  // Handle the response from the Notion API
  const notionData = await notionResponse.json()

  return NextResponse.json({ message: notionData })
}
```

**Astro**

```tsx {{ filename: 'src/api/notion.ts' }}
import { clerkClient } from '@clerk/astro/server'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async (context) => {
  // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
  // Accessing the `Auth` object differs depending on the SDK you're using
  // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
  const { isAuthenticated, userId } = context.locals.auth()

  // Protect the route from unauthenticated users
  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 })
  }

  const provider = 'notion'

  // Initialize clerkClient
  // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
  const clerkResponse = await clerkClient(context).users.getUserOauthAccessToken(userId, provider)
  const accessToken = clerkResponse.data[0]?.token ?? ''
  if (!accessToken) {
    return new Response('Access token not found', { status: 401 })
  }

  // Fetch the user data from the Notion API
  // This endpoint fetches a list of users
  // https://developers.notion.com/reference/get-users
  const notionUrl = 'https://api.notion.com/v1/users'

  const notionResponse = await fetch(notionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  // Handle the response from the Notion API
  const notionData = await notionResponse.json()

  // Return the Notion data
  return new Response(JSON.stringify({ notionData }))
}
```

**Express**

```js {{ filename: 'notion.js' }}
import { createClerkClient, getAuth } from '@clerk/express'
import express from 'express'

const app = express()
// Initialize clerkClient
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

app.get('/user', async (req, res) => {
  // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
  // Accessing the `Auth` object differs depending on the SDK you're using
  // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
  const { isAuthenticated, userId } = getAuth(req)

  // Protect the route from unauthenticated users
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  const provider = 'notion'

  // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
  const clerkResponse = await clerkClient.users.getUserOauthAccessToken(userId, provider)
  const accessToken = clerkResponse.data[0]?.token ?? ''
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not found' })
  }

  // Fetch the user data from the Notion API
  // This endpoint fetches a list of users
  // https://developers.notion.com/reference/get-users
  const notionUrl = 'https://api.notion.com/v1/users'

  const notionResponse = await fetch(notionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  // Handle the response from the Notion API
  const notionData = await notionResponse.json()

  // Return the Notion data
  res.json(notionData)
})
```

**@clerk/backend**

```js
import { createClerkClient } from '@clerk/backend'

// Initialize clerkClient
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function getNotionData(request) {
  // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
  // Accessing the `Auth` object differs depending on the SDK you're using
  // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
  const { isAuthenticated, userId } = request.auth

  // Protect the route from unauthenticated users
  if (!isAuthenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
  const provider = 'notion'
  const clerkResponse = await clerkClient.users.getUserOauthAccessToken(userId, provider)
  const accessToken = clerkResponse.data[0]?.token ?? ''
  if (!accessToken) {
    return Response.json({ error: 'Access token not found' }, { status: 403 })
  }

  // Fetch the user data from the Notion API
  // This endpoint fetches a list of users
  // https://developers.notion.com/reference/get-users
  const notionUrl = 'https://api.notion.com/v1/users'

  const notionResponse = await fetch(notionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  // Handle the response from the Notion API
  const notionData = await notionResponse.json()

  // Return the Notion data
  return notionData
}
```

**React Router**

```tsx {{ filename: 'app/routes/notion.tsx' }}
import { clerkClient, getAuth } from '@clerk/react-router/server'
import type { Route } from './+types/notion'

export async function loader(args: Route.LoaderArgs) {
  // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
  // Accessing the `Auth` object differs depending on the SDK you're using
  // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
  const { isAuthenticated, userId } = await getAuth(args)

  // Protect the route from unauthenticated users
  if (!isAuthenticated) {
    return new Response('User not authenticated', {
      status: 401,
    })
  }

  const provider = 'notion'

  // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
  const clerkResponse = await clerkClient(args).users.getUserOauthAccessToken(userId, provider)
  const accessToken = clerkResponse.data[0]?.token ?? ''
  if (!accessToken) {
    return new Response('Access token not found', {
      status: 401,
    })
  }

  // Fetch the user data from the Notion API
  // This endpoint fetches a list of users
  // https://developers.notion.com/reference/get-users
  const notionUrl = 'https://api.notion.com/v1/users'

  const notionResponse = await fetch(notionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  // Handle the response from the Notion API
  const notionData = await notionResponse.json()

  // Return the Notion data
  return { notionData }
}
```

**TanStack React Start**

```tsx {{ filename: 'app/routes/api/notion.tsx' }}
import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'

export const ServerRoute = createFileRoute('/api/notion')({
  server: {
    handlers: {
      GET: async () => {
        // The `Auth` object gives you access to properties like `isAuthenticated` and `userId`
        // Accessing the `Auth` object differs depending on the SDK you're using
        // https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object
        const { isAuthenticated, userId } = await auth()

        // Protect the route from unauthenticated users
        if (!isAuthenticated) {
          return new Response('User not authenticated', {
            status: 401,
          })
        }

        const provider = 'notion'

        // Initialize clerkClient
        // Use the `getUserOauthAccessToken()` method to get the user's OAuth access token
        const clerkResponse = await clerkClient().users.getUserOauthAccessToken(userId, provider)
        const accessToken = clerkResponse.data[0]?.token ?? ''
        if (!accessToken) {
          return new Response('Access token not found', {
            status: 401,
          })
        }

        // Fetch the user data from the Notion API
        // This endpoint fetches a list of users
        // https://developers.notion.com/reference/get-users
        const notionUrl = 'https://api.notion.com/v1/users'

        const notionResponse = await fetch(notionUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28',
          },
        })

        // Handle the response from the Notion API
        const notionData = await notionResponse.json()

        return json(notionData)
      },
    },
  },
})
```

## Supported social providers

Clerk provides a wide range of social providers to ease your users' sign-up and sign-in processes. Select a provider to learn how to configure it for your Clerk app.

- [Apple](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple.md): Add Apple as an authentication provider for your Clerk app.
- [Atlassian](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/atlassian.md): Add Atlassian as an authentication provider for your Clerk app.
- [Bitbucket](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/bitbucket.md): Add Bitbucket as an authentication provider for your Clerk app.
- [Box](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/box.md): Add Box as an authentication provider for your Clerk app.
- [Coinbase](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/coinbase.md): Add Coinbase as an authentication provider for your Clerk app.
- [Discord](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/discord.md): Add Discord as an authentication provider for your Clerk app.
- [Dropbox](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/dropbox.md): Add Dropbox as an authentication provider for your Clerk app.
- [Facebook](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/facebook.md): Add Facebook as an authentication provider for your Clerk app.
- [GitHub](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/github.md): Add GitHub as an authentication provider for your Clerk app.
- [GitLab](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/gitlab.md): Add GitLab as an authentication provider for your Clerk app.
- [Google](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google.md): Add Google as an authentication provider for your Clerk app.
- [HubSpot](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/hubspot.md): Add HubSpot as an authentication provider for your Clerk app.
- [Hugging Face](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/hugging-face.md): Add Hugging Face as an authentication provider for your Clerk app.
- [LINE](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/line.md): Add LINE as an authentication provider for your Clerk app.
- [Linear](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/linear.md): Add Linear as an authentication provider for your Clerk app.
- [LinkedIn](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/linkedin-oidc.md): Add LinkedIn as an authentication provider for your Clerk app.
- [Microsoft](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/microsoft.md): Add Microsoft as an authentication provider for your Clerk app.
- [Notion](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/notion.md): Add Notion as an authentication provider for your Clerk app.
- [Slack](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/slack.md): Add Slack as an authentication provider for your Clerk app.
- [Spotify](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/spotify.md): Add Spotify as an authentication provider for your Clerk app.
- [TikTok](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/tiktok.md): Add TikTok as an authentication provider for your Clerk app.
- [Twitch](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/twitch.md): Add Twitch as an authentication provider for your Clerk app.
- [Vercel](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/vercel.md): Add Vercel as an authentication provider for your Clerk app.
- [X/Twitter v2](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/x-twitter.md): Add X (Twitter v2) as an authentication provider for your Clerk app.
- [Xero](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/xero.md): Add Xero as an authentication provider for your Clerk app.

Don't see the provider you're looking for? You can [configure a custom OIDC-compatible provider](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/custom-provider.md) or [request a new one](https://feedback.clerk.com/roadmap).

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)
