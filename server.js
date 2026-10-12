
// server.js
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "interclasse.html");
const VOTOS_FILE = path.join(__dirname, "votos.json");

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// Lê os cookies sem precisar de dependências extras.
function getCookie(req, name) {
    const cookies = req.headers.cookie || "";

    for (const cookie of cookies.split(";")) {
        const separator = cookie.indexOf("=");

        if (separator === -1) continue;

        const key = cookie.slice(0, separator).trim();
        const value = cookie.slice(separator + 1).trim();

        if (key === name) {
            return value;
        }
    }

    return null;
}

// Cria um identificador persistente para o navegador.
function ensureDeviceCookie(req, res, next) {
    let deviceToken = getCookie(req, "peg_device");

    if (
        !deviceToken ||
        !/^[a-f0-9-]{36}$/i.test(deviceToken)
    ) {
        deviceToken = crypto.randomUUID();

        const oneYear = 60 * 60 * 24 * 365;
        const secure = process.env.NODE_ENV === "production"
            ? "; Secure"
            : "";

        res.setHeader(
            "Set-Cookie",
            `peg_device=${deviceToken}; Max-Age=${oneYear}; Path=/; HttpOnly; SameSite=Lax${secure}`
        );
    }

    req.deviceHash = crypto
        .createHash("sha256")
        .update(deviceToken)
        .digest("hex");

    next();
}

// Garante que o arquivo de votos exista.
async function initializeVotes() {
    try {
        await fs.access(VOTOS_FILE);
    } catch {
        await fs.writeFile(
            VOTOS_FILE,
            JSON.stringify(
                { peg: 0, outra: 0, voters: [] },
                null,
                2
            ),
            "utf8"
        );
    }
}

async function readVotes() {
    const content = await fs.readFile(VOTOS_FILE, "utf8");
    const data = JSON.parse(content);

    return {
        peg: Number.isFinite(data.peg) ? data.peg : 0,
        outra: Number.isFinite(data.outra) ? data.outra : 0,
        voters: Array.isArray(data.voters) ? data.voters : []
    };
}

async function saveVotes(data) {
    const temporaryFile = `${VOTOS_FILE}.tmp`;

    await fs.writeFile(
        temporaryFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    await fs.rename(temporaryFile, VOTOS_FILE);
}

// Evita que duas requisições simultâneas sobrescrevam votos.
let voteQueue = Promise.resolve();

function serializeVote(task) {
    const result = voteQueue.then(task);

    voteQueue = result.catch(() => {});

    return result;
}

// Rotas da votação.
app.get("/api/votos", ensureDeviceCookie, async (req, res) => {
    try {
        const votos = await readVotes();

        res.json({
            peg: votos.peg,
            outra: votos.outra,
            total: votos.peg + votos.outra,
            jaVotou: votos.voters.includes(req.deviceHash)
        });
    } catch (error) {
        console.error("Erro ao ler votos:", error);
        res.status(500).json({
            error: "Não foi possível carregar os votos."
        });
    }
});

app.post("/api/votar", ensureDeviceCookie, async (req, res) => {
    const escolha = req.body?.chapa;

    if (!["peg", "outra"].includes(escolha)) {
        return res.status(400).json({
            error: "Opção de voto inválida."
        });
    }

    try {
        const resultado = await serializeVote(async () => {
            const votos = await readVotes();

            if (votos.voters.includes(req.deviceHash)) {
                return {
                    status: 409,
                    body: {
                        error: "Este navegador já registrou um voto.",
                        peg: votos.peg,
                        outra: votos.outra,
                        jaVotou: true
                    }
                };
            }

            votos[escolha]++;
            votos.voters.push(req.deviceHash);

            await saveVotes(votos);

            return {
                status: 200,
                body: {
                    message: "Voto registrado com sucesso!",
                    peg: votos.peg,
                    outra: votos.outra,
                    total: votos.peg + votos.outra,
                    jaVotou: true
                }
            };
        });

        res.status(resultado.status).json(resultado.body);
    } catch (error) {
        console.error("Erro ao registrar voto:", error);

        res.status(500).json({
            error: "Não foi possível registrar o voto."
        });
    }
});

// Entrega somente os arquivos públicos.
app.use(express.static(PUBLIC_DIR));

// Rota inicial.
app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "interclasse.html"));
});

// Erros de JSON inválido.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            error: "O corpo da requisição contém JSON inválido."
        });
    }

    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor." });
});

initializeVotes()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`PEG Votação rodando na porta ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Não foi possível iniciar o servidor:", error);
        process.exit(1);
    });
