import { Manifest } from "deno-slack-sdk/mod.ts";
import SampleObjectDatastore from "./datastores/sample_datastore.ts";
import { ParseMessageFunctionDefinition } from "./functions/parse_message_function.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "newsletter-automation",
  description:
    "Newsletter Automation that helps us transform posts/messages into internal newsletter",
  outgoingDomains: [],
  icon: "assets/default_new_app_icon.png",
  datastores: [SampleObjectDatastore],
  functions: [ParseMessageFunctionDefinition],
  botScopes: [
    "chat:write",
    "im:read",
    "im:history",
    "chat:write.public",
    "groups:write",
    "groups:history",
    "datastore:read",
    "datastore:write",
    "canvases:read",
    "canvases:write",
    "channels:history",
    "channels:read",
    "mpim:history",
  ],
});
