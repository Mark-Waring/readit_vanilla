document.getElementById("threadSubmit").onsubmit = async function (event) {
  event.preventDefault();
  const threadUrl = document.getElementById("thread-url").value;
  const searchString = threadUrl.split("/r/")[1].split("/?")[0];
  const baseData = await setBaseData(searchString);
  const textString = readIt(baseData);
  const blob = new Blob([textString], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  //   const titleString = baseData.title.toLowerCase().split(" ").join("_")
  a.download = `${baseData.id}_${formatCurrentTime()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

async function getThread(searchString) {
  const response = await fetch(
    `https://www.reddit.com/r/${searchString}.json?limit=1000&sort=top`
  );
  const data = await response.json();
  return data;
}

function getReplyData(base) {
  const now = Date.now() / 60000;
  if (!base) return [];

  const replyData = [];
  for (const post of base) {
    const baseData = post.data || {};
    const details = {
      author: baseData.author,
      flair:
        (baseData.author_flair_richtext &&
          baseData.author_flair_richtext[1] &&
          baseData.author_flair_richtext[1].t) ||
        null,
      time: Math.floor(now - (baseData.created_utc || 0) / 60),
      body: baseData.body ? baseData.body.replace("amp;", " ") : "",
      bodyHtml: baseData.body_html,
      score: baseData.score,
      replyNumber:
        (baseData.replies &&
          baseData.replies.data &&
          baseData.replies.data.children &&
          baseData.replies.data.children.length) ||
        0,
      id: baseData.id,
      level: (baseData.depth || 0) + 1,
      getNestedReplies:
        getReplyData(
          baseData.replies &&
            baseData.replies.data &&
            baseData.replies.data.children
        ) || null,
    };
    replyData.push(details);
  }
  return replyData;
}

async function setBaseData(searchString) {
  const now = Date.now() / 60000; // Convert current time to minutes
  const data = await getThread(searchString);

  // Assuming data is a list of listings, get the first post's data
  const baseData = data[0].data.children[0].data;
  const post_data = {
    author: baseData.author,
    title: baseData.title,
    id: baseData.id,
    flair:
      (baseData.author_flair_richtext &&
        baseData.author_flair_richtext[1] &&
        baseData.author_flair_richtext[1].t) ||
      null,
    time: Math.floor(now - baseData.created_utc / 60),
    subreddit: baseData.subreddit_name_prefixed,
    body: baseData.selftext,
    bodyHtml: baseData.selftext_html,
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
    header: "headerImage", // Placeholder for header image
    replyNumber: post_data.replyNumber || "0",
    repliesArray: getReplyData(replyBase),
    progress: 0,
  };
}

function readReplies(replies) {
  if (!replies) return "";
  return replies
    .map((reply) => {
      if (!reply || !reply.author) return "";
      return `${reply.author}, ${convertTime(reply.time)}, ${
        reply.body
      }, Score, ${reply.score}, ${reply.replyNumber || "No"} repl${
        reply.replyNumber !== 1 ? "ies" : "y"
      }, ${readReplies(reply.getNestedReplies)}`;
    })
    .join(", ");
}

function readThread(thread) {
  if (!thread) return "";
  return `${thread.title}, ${thread.author}, ${convertTime(thread.time)}, ${
    thread.body
  }, Score, ${thread.score}, ${thread.replyNumber || "No"} comment${
    thread.replyNumber !== 1 ? "s" : ""
  }, ${readReplies(thread.repliesArray)}`;
}

function readIt(thread) {
  return `${readThread(thread).replace(/_/g, " ")}, ${readReplies(
    thread.repliesArray
  ).replace(/_/g, " ")}`;
}

function convertTime(timeInMinutes) {
  const pluralize = (display) => (display > 1 ? "s" : "");

  if (timeInMinutes > 60 * 24 * 30 * 12) {
    const displayedTime = Math.floor(timeInMinutes / (60 * 24 * 30 * 12));
    return `${displayedTime} year${pluralize(displayedTime)} ago`;
  } else if (timeInMinutes > 60 * 24 * 30) {
    const displayedTime = Math.floor(timeInMinutes / (60 * 24 * 30));
    return `${displayedTime} month${pluralize(displayedTime)} ago`;
  } else if (timeInMinutes > 60 * 24) {
    const displayedTime = Math.floor(timeInMinutes / (60 * 24));
    return `${displayedTime} day${pluralize(displayedTime)} ago`;
  } else if (timeInMinutes > 60) {
    const displayedTime = Math.floor(timeInMinutes / 60);
    return `${displayedTime} hour${pluralize(displayedTime)} ago`;
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
