const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const projectStatusEl = document.getElementById("project-status");

let activeProjectId = null;
let statusTimer = null;

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
	"Hi. For normal chat, send a message. To start planning workflow, use `/plan <your goal>`."
);

const renderStatus = (payload) => {
	if (!projectStatusEl) return;

	const project = payload.project;
	const workflow = payload.workflow;
	const tasks = payload.tasks || [];
	const events = payload.events || [];

	const tasksHtml = tasks.length
		? tasks
				.map((task) => `<li><strong>${task.title}</strong> <span>(${task.status})</span></li>`)
				.join("")
		: "<li>No tasks yet.</li>";

	const eventsHtml = events.length
		? events
				.map((event) => `<li><strong>${event.step}</strong> - ${event.status}${event.detail ? `: ${event.detail}` : ""}</li>`)
				.join("")
		: "<li>No workflow events yet.</li>";

	projectStatusEl.innerHTML = `
		<div class="status-block">
			<p><strong>Project:</strong> ${project.name}</p>
			<p><strong>Project Status:</strong> ${project.status}</p>
			<p><strong>Workflow:</strong> ${workflow.status || "n/a"}</p>
			<p><strong>Project ID:</strong> ${project.id}</p>
		</div>
		<div class="status-block">
			<h3>Tasks</h3>
			<ul>${tasksHtml}</ul>
		</div>
		<div class="status-block">
			<h3>Latest Events</h3>
			<ul>${eventsHtml}</ul>
		</div>
	`;
};

const fetchStatus = async () => {
	if (!activeProjectId) return;
	try {
		const response = await fetch(`/api/project/${activeProjectId}/status`);
		if (!response.ok) return;
		const payload = await response.json();
		renderStatus(payload);
	} catch {
		// Silent polling failure to keep chat responsive.
	}
};

const startStatusPolling = () => {
	if (statusTimer) clearInterval(statusTimer);
	fetchStatus();
	statusTimer = setInterval(fetchStatus, 3000);
};

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

		if (data.projectId) {
			activeProjectId = data.projectId;
			startStatusPolling();
		}
	} catch (error) {
		appendMessage("assistant", `Request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		setBusy(false);
		inputEl.focus();
	}
});
