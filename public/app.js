const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

const appendMessage = (role, content) => {
	const el = document.createElement("div");
	el.className = `message ${role}`;
	el.textContent = content;
	messagesEl.appendChild(el);
	messagesEl.scrollTop = messagesEl.scrollHeight;
	return el;
};

appendMessage(
	"assistant",
	"Hi. Send a message and I will respond using the Project Copilot agent."
);

const setBusy = (isBusy) => {
	sendButton.disabled = isBusy;
	sendButton.textContent = isBusy ? "Sending..." : "Send";
};

inputEl.addEventListener("keydown", (event) => {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		formEl.requestSubmit();
	}
});

formEl.addEventListener("submit", async (event) => {
	event.preventDefault();

	const message = inputEl.value.trim();
	if (!message) return;

	inputEl.value = "";
	appendMessage("user", message);
	setBusy(true);

	try {
		const response = await fetch(`/api/chat?message=${encodeURIComponent(message)}`);
		const data = await response.json();
		appendMessage("assistant", data.response || "No response received.");
	} catch (error) {
		appendMessage("assistant", `Request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		setBusy(false);
		inputEl.focus();
	}
});
