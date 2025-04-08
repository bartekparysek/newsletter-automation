import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

const channels = [
  { title: "Dzielnica Bielany", channel: "#dzielnica-bielany" },
  { title: "Dzielnica Wola", channel: "#dzielnica-wola" },
  {
    title: "Komisja Infrastruktury i Transportu",
    channel: "#komisja-infrastruktury-transportu",
  },
];

export const ParseMessageFunctionDefinition = DefineFunction({
  callback_id: "parse_message_function",
  title: "Parse Message Function",
  description: "A function to parse a message",
  source_file: "functions/parse_message_function.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.types.string,
        description: "The channel where the reaction was added",
      },
      channel_name: {
        type: Schema.types.string,
        description: "The name of the channel where the reaction was added",
      },
      message_ts: {
        type: Schema.types.string,
        description: "The timestamp of the message that was reacted to",
      },
    },
    required: ["channel_id", "message_ts", "channel_name"],
  },
  output_parameters: {
    properties: {
      parsedMsg: {
        type: Schema.types.string,
        description: "Parsed message",
      },
    },
    required: ["parsedMsg"],
  },
});

export default SlackFunction(
  ParseMessageFunctionDefinition,
  async ({ inputs, client }) => {
    const { channel_id, message_ts, channel_name } = inputs;
    console.log(message_ts, channel_id, channel_name);

    try {
      // Fetch the message that was reacted to
      const messageResponse = await client.conversations.history({
        channel: channel_id,
        latest: message_ts,
        limit: 1,
        inclusive: true,
      });

      // Check if we got the message successfully
      if (!messageResponse.messages || messageResponse.messages.length === 0) {
        return {
          error: "Could not retrieve the message that was reacted to.",
        };
      }

      const message = messageResponse.messages[0];
      const messageText = message.text || "No text content found";
      const channel = channels.find((c) => c.channel === channel_name);

      if (!channel) {
        return {
          error: "Could not find the channel that was reacted to.",
        };
      }

      const sectionResponse = await client.canvases.sections.lookup({
        canvas_id: "F08EY3TKVC7",
        criteria: {
          section_types: ["h1", "h2"],
          contains_text: channel.title,
        },
      });

      if (!sectionResponse.sections || sectionResponse.sections.length === 0) {
        return {
          error: "Could not find the section that was reacted to.",
        };
      }

      const sectionId = sectionResponse.sections[0].id;

      const updateSection = await client.canvases.edit({
        canvas_id: "F08EY3TKVC7",
        changes: [
          {
            operation: "insert_after",
            section_id: sectionId,
            document_content: {
              type: "markdown",
              markdown: `> ${messageText}\n`,
            },
          },
        ],
      });

      if (updateSection.error) {
        return {
          error: `Failed to update section: ${updateSection.error}`,
        };
      }

      return { outputs: { parsedMsg: messageText } };
    } catch (error) {
      return {
        error: `Failed to parse message: ${error}`,
      };
    }
  },
);
