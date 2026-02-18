# Unith React Native 

A React Native app featuring AI-powered conversations with a digital human and interactive messaging.

## Prerequisites

Before running this app, you'll need to set up your credentials from [Unith](https://www.unith.ai/):

1. **ORG_ID** - Your organization ID
2. **HEAD_ID** - The ID of the digital human avatar to use
3. **API_KEY** - Your Unith API key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure credentials

Open `app/(tabs)/index.tsx` and update the constants at the top:

```typescript
const ORG_ID = "your-org-id";
const HEAD_ID = "your-head-id";
const API_KEY = "your-api-key";
```

### 3. Start the app

```bash
npx expo start
```

In the output, you'll find options to open the app in:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## How to Use

1. **Start a Conversation** - Tap "Start Conversation" to begin a session with the digital human
2. **Send Text Messages** - Type in the input field and tap "Send"
3. **Mute Audio** - Toggle mute to hear/disable AI voice responses
4. **End Session** - Tap "End Session" to close the conversation

## How to implement custom speech recognition

1. Select a speech recognition provider (Azure, Eleven labs etc).
2. Establish connection and forward your devices microphone output to the providers connection / service.
3. Send valid responses to Unith by calling `conversation.sendMessage(text_response)`

Here's a function that handles your responses

```typescript
const handleSpeechRecognitionOutput = (text_response: string) => {
  if (mode !== "listening") {
    return;
  }
  conversation.sendMessage(text_response);
};
```

## Troubleshooting

### Digital human not loading

- Confirm your ORG_ID and HEAD_ID are correct
- Verify your Unith API_KEY is valid
- Check your internet connection

## Support

For issues or questions, please refer to:

- [Unith Support](https://unith.io/support)
