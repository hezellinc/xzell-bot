import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

function createButtonMsg(jid: string) {
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "Interactive RPG",
                        hasMediaAttachment: false
                    },
                    body: { text: "Pilih aksi kamu:" },
                    footer: { text: "Nexus AI" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "⚔️ Serang",
                                    id: ".serang"
                                })
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🧪 Heal",
                                    id: ".heal"
                                })
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🏃 Kabur",
                                    id: ".kabur"
                                })
                            }
                        ]
                    }
                }
            }
        }
    }, { userJid: jid });
    return msg;
}

console.log(JSON.stringify(createButtonMsg("123@s.whatsapp.net"), null, 2));
