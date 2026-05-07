---
title: "Ruby Quickstart"
url: "https://clerk.com/docs/ruby/getting-started/quickstart"
---

# Ruby Quickstart

**Example Repository**

- [Ruby Quickstart Repo](https://github.com/clerk/clerk-sdk-ruby/tree/main/apps)

**Before you start**

- [Set up a Clerk application](https://clerk.com/docs/getting-started/quickstart/setup-clerk.md)

Learn how to use Clerk to quickly and easily add secure authentication and user management to your Ruby app. If you would like to use a framework, see the [`reference docs`](https://clerk.com/docs/reference/ruby/overview.md).

1. ## Create a new Ruby app

   If you don't already have a Ruby app, run the following commands to [create a new one](https://guides.rubyonrails.org/getting_started.html).

   ```bash
   rails new clerk-ruby
   cd clerk-ruby
   ```
2. ## Install `clerk-sdk-ruby`

   The [`Clerk Ruby SDK`](https://clerk.com/docs/reference/ruby/overview.md) provides a range of backend utilities to simplify user authentication and management in your application.

   1. Add the following code to your application's `Gemfile`.
      ```ruby {{ filename: 'Gemfile' }}
      gem 'clerk-sdk-ruby', require: "clerk"
      ```
   2. Run the following command to install the SDK:
      ```sh {{ filename: 'terminal' }}
      bundle install
      ```
3. ## Configuration

   The configuration object provides a flexible way to configure the SDK. When a configuration value is not explicitly provided, it will fall back to checking the corresponding [`environment variable`](https://clerk.com/docs/reference/ruby/overview.md#available-environment-variables). You must provide your Clerk Secret Key.

   The following example shows how to set up your configuration object:

   ```ruby
   Clerk.configure do |c|
     c.secret_key = `{{secret}}` # if omitted: ENV["CLERK_SECRET_KEY"] - API calls will fail if unset
     c.logger = Logger.new(STDOUT) # if omitted, no logging
   end
   ```

   For more information, see [Faraday's documentation](https://lostisland.github.io/faraday/#/).
4. ## Instantiate a `Clerk::SDK` instance

   All available methods are listed in the [Ruby SDK documentation on GitHub](https://github.com/clerk/clerk-sdk-ruby?tab=readme-ov-file#available-resources-and-operations){{ target: '_blank' }}, which provides a more Ruby-friendly interface.

   To access available methods, you must instantiate a `Clerk::SDK` instance.

   ```ruby
   sdk = Clerk::SDK.new
   req = Clerk::Models::Operations::CreateUserRequest.new(
     first_name: "John",
     last_name: "Doe",
     email_address: ["john.doe@example.com"],
     password: "password"
   )

   # Create a user
   sdk.users.create(request: req)

   # List all users and ensure the user was created
   sdk.users.list(request: Clerk::Models::Operations::GetUserListRequest.new())

   # Get the first user created in your instance
   user = sdk.users.list(request: Clerk::Models::Operations::GetUserListRequest.new(limit: 1)).first

   # Use the user's ID to lock the user
   sdk.users.lock_user(user_id: user.id)

   # Then, unlock the user so they can sign in again
   sdk.users.unlock_user(user_id: user.id)
   ```
5. ## Run your project

   Run your project with the following command:

   ```bash
   rails server
   ```

## Next steps

Learn how to use Clerk with Ruby frameworks and deploy your app to production using the following resources.

- [Ruby on Rails integration](https://clerk.com/docs/reference/ruby/rails.md): Learn how to integrate Clerk with Ruby on Rails.
- [Sinatra integration](https://clerk.com/docs/reference/ruby/sinatra.md): Learn how to integrate Clerk with Sinatra.
- [Deploy to production](https://clerk.com/docs/guides/development/deployment/production.md): Learn how to deploy your Clerk app to production.
- [Clerk Ruby SDK Reference](https://clerk.com/docs/reference/ruby/overview.md): Learn about the Clerk Ruby SDK and how to integrate it into your app.

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)
