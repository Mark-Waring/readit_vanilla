const bodyDiv = document.querySelector(".body");
const now = Date.now() / 60000;

document.getElementById("threadSubmit").onsubmit = async function (event) {
  const threadInput = document.getElementById("thread-url");
  event.preventDefault();
  const threadUrl = threadInput.value;
  const baseData = await getThread(threadUrl);
  const textString = readIt(baseData);
  const blob = new Blob([textString], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const titleString = baseData.title
    .toLowerCase()
    .split(" ")
    .slice(0, 3)
    .join("_");
  a.download = `${titleString}_${formatCurrentTime()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  threadInput.value = "";
};

function decodeHTMLEntities(text) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  const decodedText = textArea.value;
  textArea.remove();
  return decodedText;
}

async function getThread(threadUrl) {
  if (threadUrl.includes("/s/")) {
    try {
      const response = await fetch(threadUrl);
      threadUrl = response.url;
    } catch (error) {
      window.alert("Error fetching the s URL:", error);
      throw error;
    }
  }
  threadUrl = threadUrl.split("/r/")[1].split("/?")[0];
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${threadUrl}.json?limit=1000&sort=top`
    );
    const data = await response.json();
    return setBaseData(data);
  } catch (error) {
    window.alert("Error fetching the URL:", error);
    throw error;
  }
}

function getReplyData(base = []) {
  const replyData = [];
  for (const post of base) {
    const postData = post.data;
    const details = {
      author: postData.author,
      flair: postData.author_flair_richtext?.[1]?.t,
      time: Math.floor(now - (postData.created_utc || 0) / 60),
      body: postData.body ? postData.body.replace("amp;", " ") : "",
      bodyHtml: postData.body_html,
      score: postData.score,
      id: postData.id,
      level: (postData.depth || 0) + 1,
      replies: getReplyData(getRealReplies(postData)),
    };
    replyData.push(details);
  }
  return replyData;
}

function getRealReplies(postData) {
  if (postData?.replies) {
    return postData.replies.data.children.filter((p) => p.kind === "t1");
  }
}

function setBaseData(data) {
  const baseData = data[0].data.children[0].data;
  const post_data = {
    author: baseData.author,
    title: baseData.title,
    id: baseData.id,
    flair: baseData.author_flair_richtext[1]?.t,
    time: Math.floor(now - baseData.created_utc / 60),
    subreddit: baseData.subreddit_name_prefixed,
    body: baseData.selftext,
    bodyHtml: baseData.selftext_html ?? "",
    score: baseData.score,
    level: 0,
    replyNumber: baseData.num_comments,
  };

  const replyBase = data.length > 1 ? data[1].data.children : [];
  return {
    title: post_data.title.replace("amp;", ""),
    id: post_data.id,
    author: post_data.author,
    flair: post_data.flair || "",
    time: post_data.time,
    body: post_data.body.replace("amp;", " "),
    score: post_data.score,
    subreddit: post_data.subreddit,
    replies: getReplyData(replyBase),
    progress: 0,
    bodyHtml: post_data.bodyHtml ?? "",
  };
}

function readReplies(reps = []) {
  return reps.reduce((acc, curr) => {
    const { author, body, score, replies, level } = curr;
    acc += "  ".repeat(level - 1);
    acc += `${author}: ${body} `;
    acc += `— ${score >= 0 ? "+" : ""}${score} `;
    if (replies?.length) {
      acc += `—  ${replies.length} repl${replies.length !== 1 ? "ies" : "y"}`;
      return acc + " ---\n\n" + readReplies(replies);
    }
    return acc + " ---\n\n";
  }, "");
}

function readIt(thread) {
  return `# ${thread.title}\n\n**${thread.author}**, _${convertTime(
    thread.time
  )}: ${thread.body} | ${thread.score >= 0 ? "+" : ""}${thread.score} — ${
    thread.replyNumber || "No"
  } comment${thread.replyNumber !== 1 ? "s" : ""} ---\n\n${readReplies(
    thread.replies
  )}`;
}

function convertTime(timeInMinutes) {
  const pluralize = (value) => (value > 1 ? "s" : "");
  let time = "";
  if (timeInMinutes > 60 * 24 * 30 * 12) {
    time = Math.floor(timeInMinutes / (60 * 24 * 30 * 12));
    return `${time} year${pluralize(time)} ago`;
  } else if (timeInMinutes > 60 * 24 * 30) {
    time = Math.floor(timeInMinutes / (60 * 24 * 30));
    return `${time} month${pluralize(time)} ago`;
  } else if (timeInMinutes > 60 * 24) {
    time = Math.floor(timeInMinutes / (60 * 24));
    return `${time} day${pluralize(time)} ago`;
  } else if (timeInMinutes > 60) {
    time = Math.floor(timeInMinutes / 60);
    return `${time} hour${pluralize(time)} ago`;
  }

  return timeInMinutes < 2 ? "1 minute ago" : `${timeInMinutes} minutes ago`;
}

function formatCurrentTime() {
  const now = new Date();
  const pad = (time) => time.toString().padStart(2, "0");
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const year = now.getFullYear().toString().slice(-2);
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${month}${day}${year}_${hours}${minutes}${seconds}`;
}
