import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import { fileExists } from '../modules/.miscutils/files.js';

// We're using many models to not be restricted to 3 messages per minute.
// The whole chat will be sent every request anyway.
Utils.exec(`mkdir -p ${GLib.get_user_cache_dir()}/ags/user/jan`);
const JAN_MODEL_DIR = GLib.build_filenamev([GLib.get_home_dir(), 'jan', 'models']);
const JAN_MODELS = [];

const modelDirFile = Gio.File.new_for_path(JAN_MODEL_DIR);
const enumerator = modelDirFile.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);

let fileInfo;
while ((fileInfo = enumerator.next_file(null)) !== null) {
  if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
	const dirName = fileInfo.get_name();
	// Skip adding the "config" directory to the JAN_MODELS array
	if (dirName !== 'config') {
	  JAN_MODELS.push(dirName);
	}
  }
}

// Ensure enumerator and files are closed properly
enumerator.close(null);


// Modify PROVIDERS based on JAN_MODELS
const PROVIDERS = {};
const API_URL='http://localhost:1337/v1/'
for (const modelName of JAN_MODELS) {
	PROVIDERS[modelName.toLowerCase()] = {
		'name': modelName,
		'logo_name': `jan-symbolic`,
		//'logo_name': `${modelName.toLowerCase()}-symbolic`,
		'description': `Local LLM using the ${modelName} model.\nOpen Source and locally hosted.`,
		'base_url': `${API_URL}/chat/completions`,
		'key_get_url': `${API_URL}/keys`,
		'key_file': `${modelName.toLowerCase()}_key.txt`,
	};
}

// Custom prompt
const initMessages =
	[
		{ role: "user", content: "You are an assistant on a sidebar of a Wayland Linux desktop. Please always use a casual tone when answering your questions, unless requested otherwise or making writing suggestions. These are the steps you should take to respond to the user's queries:\n1. If it's a writing- or grammar-related question or a sentence in quotation marks, Please point out errors and correct when necessary using underlines, and make the writing more natural where appropriate without making too major changes. If you're given a sentence in quotes but is grammatically correct, explain briefly concepts that are uncommon.\n2. If it's a question about system tasks, give a bash command in a code block with very brief explanation for each command\n3. Otherwise, when asked to summarize information or explaining concepts, you are encouraged to use bullet points and headings. Use casual language and be short and concise. \nThanks!", },
		{ role: "assistant", content: "- Got it!", },
		{ role: "user", content: "\"He rushed to where the event was supposed to be hold, he didn't know it got calceled\"", },
		{ role: "assistant", content: "## Grammar correction\nErrors:\n\"He rushed to where the event was supposed to be __hold____,__ he didn't know it got calceled\"\nCorrection + minor improvements:\n\"He rushed to the place where the event was supposed to be __held____, but__ he didn't know that it got calceled\"", },
		{ role: "user", content: "raise volume by 5%", },
		{ role: "assistant", content: "## Volume +5```bash\nwpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+\n```\nThis command uses the `wpctl` utility to adjust the volume of the default sink.", },
		{ role: "user", content: "main advantages of the nixos operating system", },
		{ role: "assistant", content: "## NixOS advantages\n- **Reproducible**: A config working on one device will also work on another\n- **Declarative**: One config language to rule them all. Effortlessly share them with others.\n- **Reliable**: Per-program software versioning. Mitigates the impact of software breakage", },
		{ role: "user", content: "whats skeumorphism", },
		{ role: "assistant", content: "## Skeuomorphism\n- A design philosophy- From early days of interface designing- Tries to imitate real-life objects- It's in fact still used by Apple in their icons until today.", },
	];


//const JAN_MODELS = ["gpt-3.5-turbo-1106", "gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-3.5-turbo-0613"]
const ONE_CYCLE_COUNT = 3;

class JanMessage extends Service {
	static {
		Service.register(this,
			{
				'delta': ['string'],
			},
			{
				'content': ['string'],
				'thinking': ['boolean'],
				'done': ['boolean'],
			});
	}

	_role = '';
	_content = '';
	_thinking = false;
	_done = false;

	/**
	 * Constructor for creating an instance of a class.
	 *
	 * @param {type} role - description of role parameter
	 * @param {type} content - description of content parameter
	 * @param {type} thinking - description of thinking parameter
	 * @param {type} done - description of done parameter
	 * @return {type} description of what the constructor returns
	 */
	constructor(role, content, thinking = false, done = false) {
		super();
		this._role = role;
		this._content = content;
		this._thinking = thinking;
		this._done = done;
	}

	get done() { return this._done }
	set done(isDone) { this._done = isDone; this.notify('done') }

	get role() { return this._role }
	set role(role) { this._role = role; this.emit('changed') }

	get content() { return this._content }
	/**
	 * Set the content of the object and notify observers.
	 *
	 * @param {type} content - the new content to set
	 * @return {type} 
	 */
	set content(content) {
		this._content = content;
		this.notify('content')
		this.emit('changed')
	}

	get label() { return this._parserState.parsed + this._parserState.stack.join('') }

	get thinking() { return this._thinking }
	/**
	 * Set the thinking property of the object.
	 *
	 * @param {type} thinking - The new value for the thinking property.
	 * @return {type} - The return value of the function.
	 */
	set thinking(thinking) {
		this._thinking = thinking;
		this.notify('thinking')
		this.emit('changed')
	}

	/**
	 * A function that adds a delta to the content based on the thinking state.
	 *
	 * @param {type} delta - description of the delta parameter
	 * @return {type} description of what the function returns
	 */
	addDelta(delta) {
		if (this.thinking) {
			this.thinking = false;
			this.content = delta;
		}
		else {
			this.content += delta;
		}
		this.emit('delta', delta);
	}
}

class JanService extends Service {
	static {
		Service.register(this, {
			'initialized': [],
			'clear': [],
            'newMsg': ['int'],
			'hasKey': ['boolean'],
			'providerChanged': [],
		});
	}
  _assistantPrompt = true;
  _currentProvider = userOptions.jan.defaultJanProvider;
  _cycleModels = false;
  _requestCount = 0;
  _temperature = userOptions.jan.defaultTemperature;
  _messages = [];
	_modelIndex = 0;
	
	_key = '';
  _key_file_location = `${GLib.get_user_cache_dir()}/ags/user/jan/${PROVIDERS[this._currentProvider]['key_file']}`;
  _url = GLib.Uri.parse(PROVIDERS[this._currentProvider]['base_url'], GLib.UriFlags.NONE);
    
    _decoder = new TextDecoder();

	/**
	 * Initializes key file location, key, and URL based on current provider information.
	 *
	 */
	_initChecks() {
		/**
		 * Constructor function that initializes checks and messages.
		 *
		 */
		  this._key_file_location = `${GLib.get_user_cache_dir()}/ags/user/ai/${PROVIDERS[this._currentProvider]['key_file']}`;
      if (fileExists(this._key_file_location)) this._key = Utils.readFile(this._key_file_location).trim();
      else this.emit('hasKey', false);
      this._url = GLib.Uri.parse(PROVIDERS[this._currentProvider]['base_url'], GLib.UriFlags.NONE);

	}
	constructor() {
		super();
		this._initChecks();

		if (this._assistantPrompt) this._messages = [...initMessages];
		else this._messages = [];

		this.emit('initialized');
	}

	get model() { return JAN_MODELS[this._modelIndex] }
	get keyUrl() { return PROVIDERS[this.provider]['key_get_url'] }
	get provider() { return this._currentProvider }
	/**
	 * Setter for providerID property.
	 */
	set providerID(value) {
		this._currentProvider = value;
		this.emit('providerChanged');
		this._initChecks();
	}
	get providers() { return PROVIDERS }

	get keyPath() { return this._key_file_location }
	get key() { return this._key }
	/**
	 * Sets the value of the key property and writes it to a file.
	 *
	 * @param {any} keyValue - The new value for the key property.
	 * @return {Promise} - A promise that resolves when the key is successfully written to the file.
	 */
	set key(keyValue) {
		this._key = keyValue;
		Utils.writeFile(this._key, this._key_file_location)
			.then(this.emit('hasKey', true))
			.catch(err => print(err));
	}

	get cycleModels() { return this._cycleModels }
	/**
	 * Setter for cycleModels property.
	 *
	 * @param {type} value - The new value for cycleModels
	 */
	set cycleModels(value) {
		this._cycleModels = value;
		if (!value) this._modelIndex = 0;
		else {
			this._modelIndex = (this._requestCount - (this._requestCount % ONE_CYCLE_COUNT)) % JAN_MODELS.length;
		}
	}

	get temperature() { return this._temperature }
	set temperature(value) { this._temperature = value; }

	get messages() { return this._messages }
	get lastMessage() { return this._messages[this._messages.length - 1] }

	/**
	 * Clears the messages in the object.
	 *
	 * @param {type} paramName - description of parameter
	 * @return {type} description of return value
	 */
	clear() {
		if (this._assistantPrompt)
			this._messages = [...initMessages];
		else
			this._messages = [];
		this.emit('clear');
	}

	get assistantPrompt() { return this._assistantPrompt; }
	/**
	 * Sets the assistant prompt value and updates the messages array accordingly.
	 *
	 * @param {type} value - The value to set for the assistant prompt.
	 * @return {type} - No return value.
	 */
	set assistantPrompt(value) {
		this._assistantPrompt = value;
		if (value) this._messages = [...initMessages];
		else this._messages = [];
	}

	/**
	 * Reads the response from the stream and updates the aiResponse object accordingly.
	 *
	 * @param {stream} stream - the stream to read from
	 * @param {aiResponse} aiResponse - the object to be updated with the response data
	 */
	readResponse(stream, aiResponse) {
		stream.read_line_async(
			0, null,
			(stream, res) => {
				if (!stream) return;
				const [bytes] = stream.read_line_finish(res);
				const line = this._decoder.decode(bytes);
				if (line && line != '') {
					let data = line.substr(6);
					if (data == '[DONE]') return;
					try {
						const result = JSON.parse(data);
						if (result.choices[0].finish_reason === 'stop') {
							aiResponse.done = true;
							return;
						}
						aiResponse.addDelta(result.choices[0].delta.content);
						// print(result.choices[0])
					}
					catch {
						aiResponse.addDelta(line + '\n');
					}
				}
				this.readResponse(stream, aiResponse);
			});
	}

	/**
	 * Adds a new message to the list of messages and emits an event indicating a new message has been added.
	 *
	 * @param {string} role - The role of the message sender.
	 * @param {string} message - The content of the message.
	 * @return {void} This function does not return a value.
	 */
	addMessage(role, message) {
		this._messages.push(new janMessage(role, message));
		this.emit('newMsg', this._messages.length - 1);
	}

	/**
	 * Sends a message and retrieves an AI response.
	 *
	 * @param {string} msg - The message to send.
	 * @return {void}
	 */
	send(msg) {
		this._messages.push(new janMessage('user', msg));
		this.emit('newMsg', this._messages.length - 1);
		const aiResponse = new janMessage('assistant', 'thinking...', true, false)

		const body = {
			model: JAN_MODELS[this._modelIndex],
			messages: this._messages.map(msg => { let m = { role: msg.role, content: msg.content }; return m; }),
			temperature: this._temperature,
			// temperature: 2, // <- Nuts
			stream: true,
		};

		const session = new Soup.Session();
		const message = new Soup.Message({
			method: 'POST',
			uri: this._url,
		});
		message.request_headers.append('Authorization', `Bearer ${this._key}`);
		message.set_request_body_from_bytes('application/json', new GLib.Bytes(JSON.stringify(body)));

		session.send_async(message, GLib.DEFAULT_PRIORITY, null, (_, result) => {
			const stream = session.send_finish(result);
			this.readResponse(new Gio.DataInputStream({
				close_base_stream: true,
				base_stream: stream
			}), aiResponse);
		});
		this._messages.push(aiResponse);
		this.emit('newMsg', this._messages.length - 1);

		if (this._cycleModels) {
			this._requestCount++;
			if (this._cycleModels)
				this._modelIndex = (this._requestCount - (this._requestCount % ONE_CYCLE_COUNT)) % JAN_MODELS.length;
		}
	}
}

export default new JanService();