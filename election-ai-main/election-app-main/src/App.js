import React, { useEffect, useRef, useState } from "react";
import { includesAny, preprocessText } from "./nlp";

const PARTY_ALIASES = {
  bjp: ["bjp", "bharatiya janata party", "bharatiya janata"],
  congress: ["congress", "inc", "indian national congress"],
  dmk: ["dmk", "dravida munnetra kazhagam"],
  aiadmk: [
    "aiadmk",
    "a i a d m k",
    "all india anna dravida munnetra kazhagam"
  ],
  aap: ["aap", "aam aadmi party", "aam aadmi"],
  tvk: [
    "tvk",
    "tvke",
    "t v k",
    "t v k e",
    "tamizhaga vetri kazhagam",
    "tamilaga vetri kazhagam"
  ]
};

const TAMIL_NADU_PARTIES = [
  "Dravida Munnetra Kazhagam (DMK)",
  "All India Anna Dravida Munnetra Kazhagam (AIADMK)",
  "Bharatiya Janata Party (BJP)",
  "Indian National Congress (INC)",
  "Pattali Makkal Katchi (PMK)",
  "Desiya Murpokku Dravida Kazhagam (DMDK)",
  "Marumalarchi Dravida Munnetra Kazhagam (MDMK)",
  "Viduthalai Chiruthaigal Katchi (VCK)",
  "Naam Tamilar Katchi (NTK)",
  "Amma Makkal Munnetra Kazagam (AMMK)",
  "Tamil Maanila Congress (Moopanar) (TMC)",
  "Makkal Needhi Maiam (MNM)",
  "Tamilaga Vettri Kazhagam (TVK)",
  "Communist Party of India (CPI)",
  "Communist Party of India (Marxist) (CPI-M)",
  "Indian Union Muslim League (IUML)",
  "Indhiya Jananayaga Katchi (IJK)",
  "Kongunadu Makkal Desia Katchi (KMDK)"
];

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const autoSendTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const appendBotMessage = (text) => {
    setMessages((prev) => [...prev, { sender: "bot", text, img: "" }]);
  };

  useEffect(() => {
    if (SpeechRecognitionClass && !recognitionRef.current) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang =
        (typeof navigator !== "undefined" &&
          (navigator.languages?.[0] || navigator.language)) ||
        "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const errorCode = event?.error || "unknown";
        const voiceErrorMap = {
          "not-allowed": "Microphone permission denied. Please allow microphone access.",
          "service-not-allowed": "Microphone service is blocked in this browser.",
          "no-speech": "No speech detected. Please speak clearly and try again.",
          "audio-capture": "No microphone detected. Please connect a microphone.",
          network: "Network issue while processing voice input. Try again."
        };
        appendBotMessage(
          voiceErrorMap[errorCode] ||
            "Voice input failed. Please try speaking again or type your question."
        );
      };

      recognition.onresult = (event) => {
        let voiceText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const part = event.results?.[i]?.[0]?.transcript || "";
          if (part) voiceText += `${part} `;
        }
        voiceText = voiceText.trim();
        if (!voiceText.trim()) return;
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
        }
        setInput(voiceText);
        processUserMessage(voiceText);
      };

      recognition.onnomatch = () => {
        appendBotMessage(
          "I could not analyze that voice input. Please speak clearly or type your question."
        );
      };

      recognitionRef.current = recognition;
    }
  }, [SpeechRecognitionClass]);

  const getImagePath = (fileName) =>
    `${process.env.PUBLIC_URL || ""}/${fileName}`;
  const appLogo = getImagePath("election-logo.svg");

  const electionData = {
    symbols: {
      bjp: { name: "Lotus", img: getImagePath("lotus.svg") },
      congress: { name: "Hand", img: getImagePath("hand.svg") },
      dmk: {
        name: "Rising Sun",
        img: getImagePath("rising-sun.png")
      },
      aiadmk: {
        name: "Two Leaves",
        img: getImagePath("two-leaves.svg")
      },
      aap: { name: "Broom", img: getImagePath("broom.svg") },
      tvk: { name: "Whistle", img: getImagePath("whistle.png") }
    },
    slogans: {
      bjp: ["Abki Baar Modi Sarkar"],
      congress: ["Garibi Hatao"],
      dmk: ["Ondrinaivom Vaa"],
      aiadmk: ["Makkalal Naan Makkalkaga Naan"],
      aap: ["Aam Aadmi Ki Sarkar"],
      tvk: ["Pirapokkum Ella Uyirkkum"]
    },
    proposedCM: {
      bjp: "State Candidate",
      congress: "State Candidate",
      dmk: "M.K. Stalin",
      aiadmk: "Edappadi K. Palaniswami",
      aap: "Arvind Kejriwal",
      tvk: "Vijay"
    }
  };

  const speakResponse = (text) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }
    const speech = new window.SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  const escapeRegExp = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const hasWholeWord = (text, word) =>
    new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);

  const findPartyKeyInText = (query, sourceMap) => {
    const normalizedQuery = preprocessText(query).normalizedText;
    const words = normalizedQuery.split(" ");
    const compactQuery = words.join(" ");
    const keys = Object.keys(sourceMap).sort((a, b) => b.length - a.length);
    return keys.find((key) => {
      const aliases = PARTY_ALIASES[key] || [key];
      return aliases.some((alias) =>
        new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(compactQuery)
      );
    });
  };

  const processUserMessage = (rawText) => {
    const originalText = String(rawText || "").trim();
    const processed = preprocessText(originalText);
    if (!processed.normalizedText) {
      appendBotMessage(
        "I could not analyze your input. Please ask about party symbol, slogan, or CM."
      );
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: originalText }]);

    let botMessage = { sender: "bot", text: "", img: "" };
    const symbolIntent =
      includesAny(processed.lemmaSet, ["symbol", "sign", "mark"]) ||
      includesAny(processed.stemSet, ["symbol", "sign", "mark"]);
    const sloganIntent =
      includesAny(processed.lemmaSet, ["slogan", "tagline"]) ||
      includesAny(processed.stemSet, ["slogan", "taglin"]);
    const cmIntent =
      includesAny(processed.lemmaSet, ["cm", "chief", "minister"]) ||
      includesAny(processed.stemSet, ["chief", "minist", "cm"]);
    const partyIntent =
      includesAny(processed.lemmaSet, ["party", "political"]) ||
      includesAny(processed.stemSet, ["parti", "polit"]);
    const listIntent =
      includesAny(processed.lemmaSet, ["list", "show", "all", "name"]) ||
      includesAny(processed.stemSet, ["list", "show", "all", "name"]);
    const countIntent =
      processed.normalizedText.includes("how many") ||
      includesAny(processed.lemmaSet, ["count", "number", "many"]) ||
      includesAny(processed.stemSet, ["count", "number", "mani"]);
    const tamilNaduIntent =
      processed.normalizedText.includes("tamil nadu") ||
      processed.normalizedText.includes("tamilnadu") ||
      hasWholeWord(processed.normalizedText, "tn");

    if (
      tamilNaduIntent &&
      partyIntent &&
      (countIntent || listIntent || processed.normalizedText.includes("political parties"))
    ) {
      botMessage.text =
        "Tamil Nadu has " +
        TAMIL_NADU_PARTIES.length +
        " major political parties in this app: " +
        TAMIL_NADU_PARTIES.join(", ") +
        ".";
    } else if (symbolIntent) {
      const partyKey = findPartyKeyInText(
        processed.normalizedText,
        electionData.symbols
      );

      if (partyKey) {
        botMessage.text =
          "Symbol of " +
          partyKey.toUpperCase() +
          " is " +
          electionData.symbols[partyKey].name;
        botMessage.img = electionData.symbols[partyKey].img;
      } else {
        const symbolKey = Object.keys(electionData.symbols).find((key) =>
          processed.normalizedText.includes(
            electionData.symbols[key].name.toLowerCase()
          )
        );

        if (symbolKey) {
          botMessage.text =
            "That symbol belongs to " + symbolKey.toUpperCase() + ".";
          botMessage.img = electionData.symbols[symbolKey].img;
        } else {
          botMessage.text = "Party not found.";
        }
      }
    } else if (sloganIntent) {
      const partyKey = findPartyKeyInText(
        processed.normalizedText,
        electionData.slogans
      );

      if (partyKey) {
        botMessage.text =
          "Slogan of " +
          partyKey.toUpperCase() +
          " is \"" +
          electionData.slogans[partyKey][0] +
          "\".";
      } else {
        botMessage.text = "Party not found.";
      }
    } else if (cmIntent) {
      const partyKey = findPartyKeyInText(
        processed.normalizedText,
        electionData.proposedCM
      );

      if (partyKey) {
        botMessage.text =
          "Proposed CM of " +
          partyKey.toUpperCase() +
          " is " +
          electionData.proposedCM[partyKey] +
          ".";
      } else {
        botMessage.text = "Party not found.";
      }
    } else {
      botMessage.text = "Sorry, I am trained only for election related queries.";
    }

    setMessages((prev) => [...prev, botMessage]);
    speakResponse(botMessage.text);
    setInput("");
  };

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }
    if (isListening) return;

    try {
      recognition.start();
    } catch (error) {
      alert("Unable to start voice input. Please try again.");
      return;
    }
  };

  const allSuggestions = [
    ...Object.keys(electionData.symbols).map(
      (party) => "Symbol of " + party.toUpperCase()
    ),
    ...Object.keys(electionData.slogans).map(
      (party) => "Proposed slogan of " + party.toUpperCase()
    ),
    ...Object.keys(electionData.proposedCM).map(
      (party) => "Proposed CM of " + party.toUpperCase()
    ),
    "How many political parties are there in Tamil Nadu?",
    "List all political parties in Tamil Nadu"
  ];

  const handleSubmit = () => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
    }
    processUserMessage(input);
  };

  const handleInputChange = (event) => {
    const nextInput = event.target.value;
    setInput(nextInput);

    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
    }

    if (!nextInput.trim()) return;

    autoSendTimeoutRef.current = setTimeout(() => {
      processUserMessage(nextInput);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "min(820px, 96vw)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow: "0 20px 44px rgba(20, 42, 104, 0.18)",
          backdropFilter: "blur(10px)",
          background:
            "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(240,246,255,0.88))",
          padding: "22px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "6px",
            animation: "fadeSlideDown 520ms ease-out both"
          }}
        >
          <img
            src={appLogo}
            alt="Election AI logo"
            width="54"
            height="54"
            style={{
              borderRadius: "14px",
              boxShadow: "0 8px 18px rgba(20, 42, 104, 0.18)",
              background: "rgba(255,255,255,0.9)"
            }}
          />
          <h2
            style={{
              textAlign: "center",
              margin: "2px 0 0 0",
              fontFamily: "'DM Serif Display', serif",
              color: "#1e2f69",
              fontSize: "clamp(1.55rem, 3.4vw, 2.15rem)"
            }}
          >
            Election AI Chat Assistant
          </h2>
        </div>
        <p
          style={{
            margin: "0 0 16px 0",
            textAlign: "center",
            color: "#5f6786",
            fontSize: "0.96rem",
            animation: "fadeSlideDown 620ms ease-out both"
          }}
        >
          Ask about party symbols, slogans, and CM candidates.
        </p>

        <div
          style={{
            border: "1px solid rgba(95, 115, 182, 0.25)",
            borderRadius: "16px",
            padding: "14px",
            height: "420px",
            overflowY: "auto",
            background:
              "linear-gradient(180deg, rgba(236,244,255,0.88), rgba(252,254,255,0.94))",
            scrollBehavior: "smooth"
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                textAlign: msg.sender === "user" ? "right" : "left",
                marginBottom: "14px",
                animation: `messageRise 260ms ease ${Math.min(index * 45, 260)}ms both`
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "11px 13px",
                  borderRadius: "14px",
                  color: msg.sender === "user" ? "#0f3f20" : "#142347",
                  background:
                    msg.sender === "user"
                      ? "linear-gradient(140deg, #ccf8d4, #aef0bf)"
                      : "linear-gradient(140deg, #ffffff, #edf2ff)",
                  border:
                    msg.sender === "user"
                      ? "1px solid rgba(23, 126, 52, 0.22)"
                      : "1px solid rgba(56, 86, 180, 0.16)",
                  boxShadow: "0 6px 16px rgba(22, 29, 74, 0.08)",
                  maxWidth: "86%"
                }}
              >
                <p style={{ margin: "2px 0", lineHeight: 1.45 }}>{msg.text}</p>

                {msg.img && (
                  <img
                    src={msg.img}
                    alt="Symbol"
                    width="120"
                    onLoad={() =>
                      chatEndRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "end"
                      })
                    }
                    style={{
                      marginTop: "10px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "#fff",
                      padding: "4px"
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <input
            list="suggestions"
            type="text"
            placeholder="Ask about symbols, slogans, CM, or Tamil Nadu parties..."
            value={input}
            onChange={handleInputChange}
            style={{
              flex: "1 1 360px",
              minWidth: "240px",
              maxWidth: "100%",
              padding: "12px 13px",
              borderRadius: "12px",
              border: "1px solid #aab5df",
              outline: "none",
              background: "rgba(255,255,255,0.92)",
              boxShadow: "inset 0 1px 3px rgba(20,25,70,0.08)"
            }}
          />

          <datalist id="suggestions">
            {allSuggestions.map((item, index) => (
              <option key={index} value={item} />
            ))}
          </datalist>

          <button
            onClick={startListening}
            style={{
              padding: "11px 14px",
              borderRadius: "12px",
              border: "none",
              background: isListening
                ? "linear-gradient(140deg, #ff9f80, #ff6a65)"
                : "linear-gradient(140deg, #286bff, #2a8de3)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 16px rgba(36, 97, 232, 0.26)"
            }}
          >
            {isListening ? "Listening..." : "Voice"}
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: "11px 16px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(140deg, #0ca678, #20c997)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 16px rgba(12, 166, 120, 0.26)"
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
