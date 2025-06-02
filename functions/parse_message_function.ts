import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

const channels = [
  // Dzielnice
  { title: "Dzielnica Bielany", channel: "#dzielnica-bielany" },
  { title: "Dzielnica Wola", channel: "#dzielnica-wola" },
  { title: "Dzielnica Mokotów", channel: "#dzielnica-mokotów" },
  { title: "Dzielnica Ochota", channel: "#dzielnica-ochota" },
  { title: "Dzielnica Praga-Południe", channel: "#dzielnica-praga-południe" },
  { title: "Dzielnica Praga-Północ", channel: "#dzielnica-praga-północ" },
  { title: "Dzielnica Śródmieście", channel: "#dzielnica-śródmieście" },
  { title: "Dzielnica Praga-Centrum", channel: "#dzielnica-praga-centrum" },
  { title: "Dzielnica Praga-Południe", channel: "#dzielnica-praga-południe" },
  { title: "Dzielnica Żoliborz", channel: "#dzielnica-żoliborz" },
  {
    title: "Dzielnica Wawer-Rembertów-Wesoła",
    channel: "#dzielnica-wawer-rembertów-wesoła",
  },
  {
    title: "Dzielnica Bemowo-Ursus-Włochy",
    channel: "#dzielnica-bemowo-ursus-włochy",
  },

  // Komisje
  { title: "Komisja Środowiska", channel: "#komisja-środowiska" },
  {
    title: "Komisja Ładu Przestrzennego",
    channel: "#komisja-ładu-przestrzennego-komłap",
  },
  {
    title: "Komisja Infrastruktury i Transportu",
    channel: "#komisja-infrastruktury-transportu",
  },
  {
    title: "Komisja Senioralna",
    channel: "#komisja-senioralna",
  },
  {
    title: "Komisja Mieszkalnictwa",
    channel: "#komisja-mieszkania",
  },
  { title: "Bazarki", channel: "#bazarki" },
  { title: "Hałas", channel: "#hałas" },
  { title: "Stopalkonocą", channel: "#stopalkonocą" },
  { title: "Klub książki", channel: "#klub-książki" },
  { title: "Kultura", channel: "#kultura" },
  { title: "Kino z MJN", channel: "#kino-z-mjn" },
];

function convertSlackLinks(text: string): string {
  // Regular expression to match Slack links
  const slackLinkRegex = /<([^|>]+)\|?([^>]*)>/g;

  return text.replace(slackLinkRegex, (match, url, title) => {
    // If there's a title use it, otherwise use the URL
    const linkText = title || url;
    if (linkText.startsWith("@")) {
      return `![](${url})`;
    } else {
      return `[${linkText}](${url})`;
    }
  });
}

// Function to remove emoji codes
function removeEmojiCodes(text: string): string {
  // Regular expression to match emoji codes
  const emojiCodeRegex = /:[a-z0-9_+-]+:/g;

  return text.replace(emojiCodeRegex, "");
}

function removeDashes(text: string): string {
  // Remove dashes (both en dash and em dash) from the text
  return text.replace(/[–—-]/g, "");
}

function removeStringConcatenation(text: string): string {
  // Remove "\n" + patterns
  return text.replace(/"\n" \+\s*/g, "");
}

function removeNewLines(text: string): string {
  // Remove new lines from the text
  return text.replace(/\n/g, "");
}

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
      canvas_id: {
        type: Schema.types.string,
        description: "The canvas id where the message will be added",
      },
    },
    required: ["channel_id", "message_ts", "channel_name", "canvas_id"],
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
    const { channel_id, message_ts, channel_name, canvas_id } = inputs;

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
        canvas_id: canvas_id,
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

      let markdownText = messageText;
      markdownText = convertSlackLinks(markdownText);
      markdownText = removeDashes(markdownText);

      console.log(markdownText);

      const updateSection = await client.canvases.edit({
        canvas_id: canvas_id,
        changes: [
          {
            operation: "insert_after",
            section_id: sectionId,
            document_content: {
              type: "markdown",
              markdown: `> ${markdownText} \n `,
            },
          },
        ],
      });

      if (updateSection.error) {
        return {
          error: `Failed to update section: ${updateSection.error}`,
        };
      }

      return { outputs: { parsedMsg: markdownText } };
    } catch (error) {
      return {
        error: `Failed to parse message: ${error}`,
      };
    }
  },
);
