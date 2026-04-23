const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const projectStatusEl = document.getElementById("project-status");

let activeProjectId = null;
let statusTimer = null;
let statusSource = null;

const escapeHtml = (value) =>
	String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const parseInlineField = (text) => {
	const match = String(text)
		.trim()
		.match(/^\"?([a-zA-Z_][a-zA-Z0-9_]*)\"?\s*:\s*\"(.+?)\"\s*,?$/);
	if (!match) return null;
	return { key: match[1].toLowerCase(), value: match[2].trim() };
};

const cleanTaskTitle = (rawTitle) => {
	const field = parseInlineField(rawTitle);
	if (field?.key === "title") return field.value;

	const cleaned = String(rawTitle)
		.replace(/[{}\[\],]/g, "")
		.replace(/^\"?title\"?\s*:\s*/i, "")
		.replace(/^\"|\"$/g, "")
		.trim();

	return cleaned;
};

const shouldHideTaskRow = (rawTitle) => {
	const field = parseInlineField(rawTitle);
	if (!field) return false;
	return field.key === "details";
};

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
				.filter((task) => !shouldHideTaskRow(task.title))
				.map(
					(task) =>
						{
							const title = cleanTaskTitle(task.title);
							const details = String(task.details || "").trim();
							const titleAttr = details ? ` title="${escapeHtml(details)}"` : "";

							return `<li>
								<div class="task-row">
									<div>
										<strong${titleAttr}>${escapeHtml(title)}</strong>
									</div>
									<select class="task-status" data-task-id="${task.id}">
										<option value="pending" ${task.status === "pending" ? "selected" : ""}>pending</option>
										<option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>in_progress</option>
										<option value="done" ${task.status === "done" ? "selected" : ""}>done</option>
									</select>
								</div>
							</li>`;
						}
				)
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

	for (const selectEl of projectStatusEl.querySelectorAll(".task-status")) {
		selectEl.addEventListener("change", async (event) => {
			const target = event.currentTarget;
			if (!(target instanceof HTMLSelectElement)) return;
			const taskId = target.dataset.taskId;
			if (!taskId) return;

			try {
				await fetch(`/api/task/${taskId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: target.value })
				});
				await fetchStatus();
			} catch {
				appendMessage("assistant", "Failed to update task status.");
			}
		});
	}
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

const startStatusStream = () => {
	if (!activeProjectId) return;
	if (statusSource) {
		statusSource.close();
		statusSource = null;
	}

	try {
		statusSource = new EventSource(`/api/project/${activeProjectId}/stream`);
		statusSource.addEventListener("status", (event) => {
			try {
				const payload = JSON.parse(event.data);
				renderStatus(payload);
			} catch {
				// Ignore malformed stream payloads.
			}
		});

		statusSource.addEventListener("error", () => {
			if (statusSource) {
				statusSource.close();
				statusSource = null;
			}
			startStatusPolling();
		});
	} catch {
		startStatusPolling();
	}
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
			startStatusStream();
		}
	} catch (error) {
		appendMessage("assistant", `Request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		setBusy(false);
		inputEl.focus();
	}
});
