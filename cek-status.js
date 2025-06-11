const { Octokit } = require("@octokit/rest");
const axios = require("axios");

const GITHUB_TOKEN = process.env.MY_GH_TOKEN;

const REPO_OWNER = "YanaMiku-BOTz";
const REPO_NAME = "celengan-yanamiku";
const PATH_DATA = "media/data.json";
const PATH_CELENGAN = "media/celengan.json";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const headers = {
  owner: REPO_OWNER,
  repo: REPO_NAME
};

async function getFileContent(path) {
  const { data } = await octokit.repos.getContent({ ...headers, path });
  const content = Buffer.from(data.content, "base64").toString();
  return { content: JSON.parse(content), sha: data.sha };
}

async function updateFile(path, contentObj, sha, message) {
  const content = Buffer.from(JSON.stringify(contentObj, null, 2)).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    ...headers,
    path,
    message,
    content,
    sha
  });
}

async function checkMutasi(amount) {
  try {
    const res = await axios.get("https://mutasi-yanamiku.vercel.app/api/check", {
      params: {
        merchant: "OK975111",
        apikey: "74182271712506944975111OKCT42E00090E41E010C301FEF9581F96E42",
        amount: amount
      }
    });
    return res.data.match === "found";
  } catch (err) {
    console.error("Error checking mutasi:", err.message);
    return false;
  }
}

async function main() {
  try {
    const { content: dataJson, sha: dataSha } = await getFileContent(PATH_DATA);
    const { content: celenganJson, sha: celenganSha } = await getFileContent(PATH_CELENGAN);

    for (const [amountStr, info] of Object.entries(dataJson)) {
      if (!info.status) {
        const amount = parseInt(amountStr, 10);
        const found = await checkMutasi(amount);

        if (found) {
          console.log(`Amount ${amount} ditemukan! Updating data...`);
          dataJson[amountStr].status = true;
          celenganJson.tabungan += amount;

          await updateFile(PATH_DATA, dataJson, dataSha, `Update status ${amount} to true`);
          await updateFile(PATH_CELENGAN, celenganJson, celenganSha, `Add ${amount} to tabungan`);
        } else {
          console.log(`Amount ${amount} not found.`);
        }

        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

  } catch (err) {
    console.error("Main error:", err.message);
    process.exit(1);
  }
}

main();