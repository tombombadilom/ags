# ags config files
![Screenshot](./screenshot.png)

As always a Work in Progress... 

This are my own .config/ags files, with Local Ai , Ollama and maybe later LM-Studio addons 
- Each of those projects allow LLM to be executed localy 
- For some you need GPU ,
- For others you just need CPU and an little RAM
- Finally some others need a bit of GPU , RAM and GPU

## Jan-ai
- [WebSite](https://jan.ai/)
- [Documentation](https://jan.ai/docs/)
- [GitHub](https://github.com/janhq/jan)
Jan runs on Linux (Appimage and .deb available), Windows and macOS (Intel / Silicon) and offers support for open source models such as GGUF via llama.cpp, TensorRT via TensorRT-LLM or external APIs. Jan also uses the Nitro inference engine, from the same developers, which is designed to be fast and lightweight.

If you don't have an NVIDIA card, no problem: install Vulkan and it will take your card and its GPU.

A cool thing about Jan is that all conversations are stored on your disk in JSON format, so if you feel like it, you can exploit them as you see fit with your tools.

Jan offers a REST server which, via an OpenAI-compatible API, can query any model you run on it. It lets you plug your tools or scripts directly into the open LLM of your choice.

For the time being,
I'm interested in integrating a gateway to Jan's api, directly to my AGS Huprland X.

## Ollama
- [Project Web Site](https://ollama.com/)
- [Models](https://ollama.com/library)
- [Blog](https://ollama.com/blog)
- [GithHub](https://github.com/ollama/ollama)
### gguf-to-ollama
Dagger functions to import Hugging Face GGUF models into a local ollama instance and optionally push them to ollama.com.
- [GitHub](https://github.com/adrienbrault/hf-gguf-to-ollama)

## Local AI

- [Project WebSite](https://localai.io)
- [Documentation](https://localai.io/docs/)
- [GithHub](https://github.com/mudler/LocalAI)
  
## LM-Studio
- [WebSite](https://lmstudio.ai/)
- [GitHub](https://github.com/lmstudio-ai)

## UseAnything
- [WebSite](https://useanything.com/)
- [Documentation](https://docs.useanything.com/)
- [GitHub](https://github.com/Mintplex-Labs/anything-llm)

## AGS sources 
- [Aylur](https://github.com/Aylur)
- [Documentation](https://aylur.github.io/ags-docs/)
- [GitHub](https://github.com/Aylur/ags)

# DEBUG 
In case you lose your menu bars and side panels, you obviously have a bug in your code:

### Debug procedure:
#### Kill AGS 
```bash
ps aux | grep ags
tom 399137 1.6 0.3 3876604 223844 tty2 Sl+ 08:40 1:04 /usr/bin/gjs -m /usr/local/bin/ags
kill 399137
```
#### restart AGS in your terminal 
##### Simple method
```bash 
ags --config $HOME/.config/ags/config.js
```
##### Full method
```bash
 /usr/bin/gjs -m /usr/bin/ags --config $HOME/.config/ags/config.js
```
Your terminal will spit out all the logs you need to debug your code
