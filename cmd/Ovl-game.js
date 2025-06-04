const { ovlcmd } = require("../lib/ovlcmd");
const axios = require("axios");
const config = require('../set');
let activeGames = {};

ovlcmd(
    {
        nom_cmd: "tictactoe",
        classe: "OVL-GAMES",
        react: "🎮",
        desc: "Jeu du Tic-Tac-Toe",
        alias: ["ttt"],
    },
    async (ms_org, ovl, cmd_options) => {
        const { arg, ms, msg_Repondu, auteur_Msg_Repondu, auteur_Message } = cmd_options;
        let joueur1Nom = auteur_Message.split('@')[0];
        let joueur2Nom, joueur2ID;

        if (msg_Repondu) {
            joueur2Nom = auteur_Msg_Repondu.split('@')[0];
            joueur2ID = auteur_Msg_Repondu;
        } else if (arg.length > 0 && arg[0].includes('@')) {
            joueur2Nom = arg[0].replace("@", "");
            joueur2ID = `${joueur2Nom}@lid`;
        } else {
            return ovl.sendMessage(ms_org, {
                text: '🙋‍♂️ Veuillez *mentionner* ou *répondre* au message du joueur pour lancer une partie.',
            }, { quoted: ms });
        }

        if (auteur_Message === joueur2ID) {
            return ovl.sendMessage(ms_org, {
                text: "🚫 Vous ne pouvez pas jouer contre vous-même !",
            }, { quoted: ms });
        }

        if (activeGames[auteur_Message] || activeGames[joueur2ID]) {
            delete activeGames[auteur_Message];
            delete activeGames[joueur2ID];
        }

        const gameID = `${Date.now()}-${auteur_Message}-${joueur2ID}`;
        activeGames[auteur_Message] = { opponent: joueur2ID, gameID };
        activeGames[joueur2ID] = { opponent: auteur_Message, gameID };

        await ovl.sendMessage(ms_org, {
            text: `🎮 *Tic-Tac-Toe Défi !*\n\n🔸 @${joueur1Nom} défie @${joueur2Nom} !\n\n✍️ Pour accepter, réponds *oui* dans les 60 secondes.`,
            mentions: [auteur_Message, joueur2ID]
        }, { quoted: ms });

        try {
            const rep = await ovl.recup_msg({
                auteur: joueur2ID,
                ms_org,
                temps: 60000
            });

            const reponse = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";
            if (reponse.toLowerCase() === 'oui') {

                let grid = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
                let currentPlayer = 0;
                let symbols = ['❌', '⭕'];
                let players = [auteur_Message, joueur2ID];

                activeGames[auteur_Message] = { opponent: joueur2ID, grid, currentPlayer, gameID };
                activeGames[joueur2ID] = { opponent: auteur_Message, grid, currentPlayer, gameID };

                const displayGrid = (endGame = false) => {
                    let grille = `
╔═══╦═══╦═══╗
║ ${grid[0]}    ${grid[1]}    ${grid[2]}
╠═══╬═══╬═══╣
║ ${grid[3]}    ${grid[4]}    ${grid[5]}
╠═══╬═══╬═══╣
║ ${grid[6]}    ${grid[7]}    ${grid[8]}
╚═══╩═══╩═══╝

❌ : @${joueur1Nom}
⭕ : @${joueur2Nom}`;
                    if (!endGame) {
                        grille += `\n\n🎯 C'est au tour de @${players[currentPlayer].split('@')[0]} de jouer !`;
                    }
                    return grille;
                };

                const checkWin = (symbol) => {
                    const winningCombos = [
                        [0, 1, 2], [3, 4, 5], [6, 7, 8],
                        [0, 3, 6], [1, 4, 7], [2, 5, 8],
                        [0, 4, 8], [2, 4, 6]
                    ];
                    return winningCombos.some(combo => combo.every(index => grid[index] === symbol));
                };

                for (let turn = 0; turn < 9; turn++) {
                    let symbol = symbols[currentPlayer];
                    await ovl.sendMessage(ms_org, {
                        text: displayGrid(),
                        mentions: [auteur_Message, joueur2ID]
                    }, { quoted: ms });

                    let position, valide = false;
                    while (!valide) {
                        const rep = await ovl.recup_msg({
                            auteur: players[currentPlayer],
                            ms_org,
                            temps: 60000
                        });

                        let response = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";

                        if (!isNaN(response)) {
                            position = parseInt(response);
                            if (grid[position - 1] !== '❌' && grid[position - 1] !== '⭕' && position >= 1 && position <= 9) {
                                grid[position - 1] = symbol;
                                valide = true;
                            } else {
                                await ovl.sendMessage(ms_org, {
                                    text: "❗ *Position invalide !* Choisis une case encore libre (1 à 9).",
                                    mentions: players
                                }, { quoted: ms });
                            }
                        } else if (response.toLowerCase().startsWith(config.PREFIXE + "ttt")) {
                            // Ignorer relancement du jeu pendant la partie
                        } else {
                            await ovl.sendMessage(ms_org, {
                                text: "❌ *Entrée invalide !* Réponds avec un chiffre entre 1 et 9.",
                                mentions: players
                            }, { quoted: ms });
                        }
                    }

                    if (checkWin(symbol)) {
                        await ovl.sendMessage(ms_org, {
                            text: `🏆 *Victoire !*\n\n🎉 @${players[currentPlayer].split('@')[0]} a gagné la partie !\n${displayGrid(true)}`,
                            mentions: players
                        }, { quoted: ms });
                        delete activeGames[auteur_Message];
                        delete activeGames[joueur2ID];
                        return;
                    }

                    currentPlayer = 1 - currentPlayer;
                    activeGames[auteur_Message].currentPlayer = currentPlayer;
                    activeGames[joueur2ID].currentPlayer = currentPlayer;
                }

                await ovl.sendMessage(ms_org, {
                    text: `🤝 *Match Nul !*\n\nAucun gagnant cette fois-ci !\n${displayGrid(true)}`,
                    mentions: players
                }, { quoted: ms });

                delete activeGames[auteur_Message];
                delete activeGames[joueur2ID];

            } else {
                return ovl.sendMessage(ms_org, {
                    text: '❌ Invitation refusée par le joueur.',
                }, { quoted: ms });
            }

        } catch (error) {
            if (error.message === 'Timeout') {
                await ovl.sendMessage(ms_org, {
                    text: `⏱️ @${joueur2Nom} a mis trop de temps. Partie annulée.`,
                    mentions: [auteur_Message, joueur2ID]
                }, { quoted: ms });
            } else {
                console.error(error);
            }
            delete activeGames[auteur_Message];
            delete activeGames[joueur2ID];
        }
    }
);

ovlcmd(
  {
    nom_cmd: "anime-quizz",
    classe: "OVL-GAMES",
    react: "📺",
    desc: "Réponds à une question d’anime avec 15 secondes pour choisir la bonne option.",
    alias: ["a-quizz"]
  },
  async (ms_org, ovl, { repondre, auteur_Message }) => {
    let questions;
    try {
      const res = await axios.get("https://raw.githubusercontent.com/Ainz-devs/OVL-THEME/main/quizz_anime.json");
      questions = res.data;
    } catch {
      return repondre("❌ Impossible de récupérer les questions depuis GitHub.");
    }

    const questionData = questions[Math.floor(Math.random() * questions.length)];
    const { question, options, answer } = questionData;

    const optionList = Object.values(options)
      .map((text, i) => `➤ ${i + 1}. *${text}*`)
      .join("\n");

    const message = `╭──⟪ 🎯 Quiz Anime ⟫──╮
│
│ ${question}
│
${optionList.split("\n").map(l => `│ ${l}`).join("\n")}
│
╰⌛️ *Tu as 15 secondes pour répondre avec un chiffre entre 1 et 4.*`;

    await ovl.sendMessage(ms_org, { text: message });

    try {
      const reponse = await ovl.recup_msg({
        auteur: auteur_Message,
        ms_org,
        temps: 15000
      });

      let userReply = reponse?.message?.conversation || reponse?.message?.extendedTextMessage?.text || "";
      userReply = userReply.trim();

      if (!["1", "2", "3", "4"].includes(userReply)) {
        return repondre("Tu dois répondre avec un chiffre entre *1* et *4*.");
      }

      const numbersToLetters = { "1": "a", "2": "b", "3": "c", "4": "d" };
      const userAnswerLetter = numbersToLetters[userReply]; // en minuscule
      const correctAnswerLetter = answer.toLowerCase(); // aussi en minuscule
      const correctAnswerText = options[correctAnswerLetter];

      if (userAnswerLetter === correctAnswerLetter) {
        return repondre(`✅ Bravo ! La bonne réponse était bien *${correctAnswerText}*.`);
      } else {
        return repondre(`❌ Dommage ! La bonne réponse était *${correctAnswerText}*.`);
      }
    } catch {
      return repondre("⏱️ Temps écoulé ! Tu n’as pas répondu à temps.");
    }
  }
);

/*ovlcmd(
  {
    nom_cmd: "dmots",
    classe: "OVL-GAMES",
    react: "🧹",
    desc: "Jouez à plusieurs au jeu du Mot Mélangé ! Rejoignez la partie avec 'join'.",
  },
  async (ms_org, ovl, { repondre, auteur_Message }) => {
    let mots = [];
    try {
      const res = await axios.get("https://raw.githubusercontent.com/Ainz-devs/OVL-THEME/main/jeu-melange-mots.json");
      mots = res.data;
    } catch {
      return repondre("❌ Impossible de récupérer la liste des mots.");
    }

    const joueurs = [{ id: auteur_Message, score: 0 }];
    const debutInscription = Date.now();

    await ovl.sendMessage(ms_org, {
      text:
        "╭──⟪ 🧹 𝘿𝗲𝘃𝗶𝗻𝗲 𝗹𝗲 𝗠𝗼𝘁 𝗠é𝗹𝗮𝗻𝗴é ⟫──╮\n" +
        "├ Une partie va bientôt commencer !\n" +
        "├ Tapez 'join' pour participer dans les 60 secondes.\n" +
        "├ Le jeu commence avec des mots courts,\n" +
        "├ puis ils deviennent plus longs à chaque tour.\n" +
        "├ Vous disposez de 15 secondes par mot.\n" +
        "├ Le dernier joueur restant gagne la partie.\n" +
        "╰───────────────────────╯\n"
    });

    while (Date.now() - debutInscription < 60000) {
      try {
        const rep = await ovl.recup_msg({ ms_org, temps: 60000 - (Date.now() - debutInscription) });
        let response = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";
        const txt = response.toLowerCase().trim();
        const auteur = rep?.key?.participant || rep?.message?.senderKey || "Joueur";

        if (txt === "join" && !joueurs.some(j => j.id === auteur)) {
          joueurs.push({ id: auteur, score: 0 });
          await ovl.sendMessage(ms_org, {
            text: `✅ @${auteur.split("@")[0]} a rejoint la partie !`,
            mentions: [auteur],
          });
        }
      } catch {
        break;
      }
    }

if (joueurs.length < 2) return repondre("❌ Pas assez de joueurs pour commencer (minimum 2).");

    await ovl.sendMessage(ms_org, {
      text:
        "╭──⟪ 🚀 𝗗é𝗽𝗮𝗿𝘁 𝗱𝗲 𝗹𝗮 𝗽𝗮𝗿𝘁𝗶𝗲 ⟫──╮\n" +
        `├ Joueurs : ${joueurs.map(j => "@" + j.id.split("@")[0]).join(", ")}\n` +
        "├ Que la chance soit avec vous🍀\n" +
        "╰──────────────────╯",
      mentions: joueurs.map(j => j.id),
    });

    let tour = 1;
    let joueurIndex = 0;
    let joueursActifs = [...joueurs];

    function motsSelonTour(t) {
      if (t === 1) return mots.filter(m => m.length >= 4 && m.length <= 5);
      if (t === 2) return mots.filter(m => m.length >= 6 && m.length <= 7);
      return mots.filter(m => m.length >= 8);
    }

    function melangerMotIntelligent(mot) {
      let melange = mot;
      let essais = 0;
      while ((melange === mot || tropDifficile(melange, mot)) && essais < 10) {
        const lettres = mot.split("");
        for (let i = lettres.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
        }
        melange = lettres.join("");
        essais++;
      }
      return melange;
    }

    function tropDifficile(melange, original) {
      let bonnesPositions = 0;
      for (let i = 0; i < original.length; i++) {
        if (melange[i] === original[i]) bonnesPositions++;
      }
      return bonnesPositions === 0;
    }

    while (joueursActifs.length > 1) {
      const joueur = joueursActifs[joueurIndex];
      const listeMots = motsSelonTour(tour);
      if (!listeMots.length) break;

      let motOriginal = listeMots[Math.floor(Math.random() * listeMots.length)];
      let motMelange = melangerMotIntelligent(motOriginal);

      await ovl.sendMessage(ms_org, {
        text:
          "╭──⟪ 🎯 𝗧𝗼𝘂𝗿 𝗱𝘂 𝗷𝗼𝘂𝗲𝘂𝗿 ⟫───\n" +
          `├ 🎮 @${joueur.id.split("@")[0]} à toi de jouer !\n` +
          `├ 🔀 Mot mélangé : \`${motMelange}\`\n` +
          `├ ℹ️ Indice : le mot commence par *${motOriginal[0].toUpperCase()}*\n` +
          "├ ⏱️ Tu as 15 secondes pour répondre.\n" +
          "╰────────────────────────────╯",
        mentions: [joueur.id],
      });

      let reussi = false;
      try {
        const rep = await ovl.recup_msg({ ms_org, auteur: joueur.id, temps: 15000 });
        let response = rep?.message?.conversation || rep?.message?.extendedTextMessage?.text || "";
        const txtRep = response.toLowerCase().trim();

        if (txtRep === motOriginal.toLowerCase()) {
          reussi = true;
          joueur.score++;
          await ovl.sendMessage(ms_org, {
            text: `✅ Bonne réponse @${joueur.id.split("@")[0]} ! Le mot était *${motOriginal}*.`,
            mentions: [joueur.id],
          });
        } else {
          await ovl.sendMessage(ms_org, {
            text: `❌ Mauvaise réponse @${joueur.id.split("@")[0]} ! Le mot était *${motOriginal}*.`,
            mentions: [joueur.id],
          });
        }
      } catch {
        await ovl.sendMessage(ms_org, {
          text: `⏱️ Temps écoulé, @${joueur.id.split("@")[0]} est éliminé !`,
          mentions: [joueur.id],
        });
      }

      if (!reussi) {
        joueursActifs.splice(joueurIndex, 1);
        if (joueurIndex >= joueursActifs.length) joueurIndex = 0;
      } else {
        joueurIndex = (joueurIndex + 1) % joueursActifs.length;
      }

      if (joueurIndex === 0) {
        tour++;
        await ovl.sendMessage(ms_org, {
          text: `⬆️ Niveau suivant — mots plus longs ! Tour n°${tour}`,
        });
      }
    }

    if (joueursActifs.length === 1) {
      const gagnant = joueursActifs[0];
      let menu = "╭──⟪ 🏆 𝗙𝗶𝗻 𝗱𝗲 𝗽𝗮𝗿𝘁𝗶𝗲 ⟫──╮\n";
      menu += `├ Le gagnant est @${gagnant.id.split("@")[0]} avec *${gagnant.score}* point${gagnant.score > 1 ? "s" : ""} !\n\n`;
      menu += "├ 📊 Scores finaux :\n";
      for (const j of joueurs) {
        menu += `├ • @${j.id.split("@")[0]} : ${j.score} point${j.score > 1 ? "s" : ""}\n`;
      }
      menu += "╰─────────────────────────────╯";
      await ovl.sendMessage(ms_org, { text: menu, mentions: joueurs.map(j => j.id) });
    } else {
      await ovl.sendMessage(ms_org, { text: "⚠️ Partie terminée prématurément." });
    }
  }
);
*/
