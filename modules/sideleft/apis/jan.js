const { Gtk } = imports.gi;
import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

const { Box, Button, Icon, Label, Revealer, Scrollable } = Widget;
import JanService from '../../../services/jan.js';
import { setupCursorHover, setupCursorHoverInfo } from '../../.widgetutils/cursorhover.js';
import { SystemMessage, JanMessage } from "./ai_janmessage.js";
import { ConfigToggle, ConfigSegmentedSelection, ConfigGap } from '../../.commonwidgets/configwidgets.js';
import { markdownTest } from '../../.miscutils/md2pango.js';
import { MarginRevealer } from '../../.widgethacks/advancedrevealers.js';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { chatEntry } from '../apiwidgets.js';

export const janTabIcon = Icon({
    hpack: 'center',
    className: 'sidebar-chat-apiswitcher-icon',
    icon: `jan-symbolic`,
});

const ProviderSwitcher = () => {
    const ProviderChoice = (id, provider) => {
        const providerSelected = MaterialIcon('check', 'norm', {
            setup: (self) => self.hook(JanService, (self) => {
                self.toggleClassName('invisible', JanService.providerID !== id);
            }, 'providerChanged')
        });
        return Button({
            tooltipText: provider.description,
            onClicked: () => {
                JanService.providerID = id;
                providerList.revealChild = false;
                indicatorChevron.label = 'expand_more';
            },
            child: Box({
                className: 'spacing-h-10 txt',
                children: [
                    Icon({
                        icon: provider['logo_name'],
                        className: 'txt-large'
                    }),
                    Label({
                        hexpand: true,
                        xalign: 0,
                        className: 'txt-small',
                        label: provider.name,
                    }),
                    providerSelected
                ],
            }),
            setup: setupCursorHover,
        });
    }
    const indicatorChevron = MaterialIcon('expand_more', 'norm');
    const indicatorButton = Button({
        tooltipText: 'Select Jan-compatible API provider',
        child: Box({
            className: 'spacing-h-10 txt',
            children: [
                MaterialIcon('cloud', 'norm'),
                Label({
                    hexpand: true,
                    xalign: 0,
                    className: 'txt-small',
                    label: JanService.providerID,
                    setup: (self) => self.hook(JanService, (self) => {
                        self.label = `${JanService.providers[JanService.providerID]['name']}`;
                    }, 'providerChanged')
                }),
                indicatorChevron,
            ]
        }),
        onClicked: () => {
            providerList.revealChild = !providerList.revealChild;
            indicatorChevron.label = (providerList.revealChild ? 'expand_less' : 'expand_more');
        },
        setup: setupCursorHover,
    });
    const providerList = Revealer({
        revealChild: false,
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        child: Box({
            vertical: true, className: 'spacing-v-5 sidebar-chat-providerswitcher-list',
            children: [
                Box({ className: 'separator-line margin-top-5 margin-bottom-5' }),
                Box({
                    className: 'spacing-v-5',
                    vertical: true,
                    setup: (self) => self.hook(JanService, (self) => {
                        self.children = Object.entries(JanService.providers)
                            .map(([id, provider]) => ProviderChoice(id, provider));
                    }, 'initialized'),
                })
            ]
        })
    })
    return Box({
        hpack: 'center',
        vertical: true,
        className: 'sidebar-chat-providerswitcher',
        children: [
            indicatorButton,
            providerList,
        ]
    })
}

const JanInfo = () => {
    const openAiLogo = Icon({
        hpack: 'center',
        className: 'sidebar-chat-welcome-logo',
        icon: `jan-symbolic`,
    });
    return Box({
        vertical: true,
        className: 'spacing-v-15',
        children: [
            openAiLogo,
            Label({
                className: 'txt txt-title-small sidebar-chat-welcome-txt',
                wrap: true,
                justify: Gtk.Justification.CENTER,
                label: 'Assistant (Jans)',
            }),
            Box({
                className: 'spacing-h-5',
                hpack: 'center',
                children: [
                    Label({
                        className: 'txt-smallie txt-subtext',
                        wrap: true,
                        justify: Gtk.Justification.CENTER,
                        label: 'Provider shown above',
                    }),
                    Button({
                        className: 'txt-subtext txt-norm icon-material',
                        label: 'info',
                        tooltipText: 'Uses Jan-3.5-turbo.\nNot affiliated, endorsed, or sponsored by OpenAI.\n\nPrivacy: OpenAI claims they do not use your data\nwhen you use their API. Idk about others.',
                        setup: setupCursorHoverInfo,
                    }),
                ]
            }),
        ]
    });
}

const JanSettings = () => MarginRevealer({
    transition: 'slide_down',
    revealChild: true,
    extraSetup: (self) => self
        .hook(JanService, (self) => Utils.timeout(200, () => {
            self.attribute.hide();
        }), 'newMsg')
        .hook(JanService, (self) => Utils.timeout(200, () => {
            self.attribute.show();
        }), 'clear')
    ,
    child: Box({
        vertical: true,
        className: 'sidebar-chat-settings',
        children: [
            ConfigSegmentedSelection({
                hpack: 'center',
                icon: 'casino',
                name: 'Randomness',
                desc: 'The model\'s temperature value.\n  Precise = 0\n  Balanced = 0.5\n  Creative = 1',
                options: [
                    { value: 0.00, name: 'Precise', },
                    { value: 0.50, name: 'Balanced', },
                    { value: 1.00, name: 'Creative', },
                ],
                initIndex: 2,
                onChange: (value, name) => {
                    JanService.temperature = value;
                },
            }),
            ConfigGap({ vertical: true, size: 10 }), // Note: size can only be 5, 10, or 15 
            Box({
                vertical: true,
                hpack: 'fill',
                className: 'sidebar-chat-settings-toggles',
                children: [
                    ConfigToggle({
                        icon: 'cycle',
                        name: 'Cycle models',
                        desc: 'Helps avoid exceeding the API rate of 3 messages per minute.\nTurn this on if you message rapidly.',
                        initValue: JanService.cycleModels,
                        onChange: (self, newValue) => {
                            JanService.cycleModels = newValue;
                        },
                    }),
                    ConfigToggle({
                        icon: 'model_training',
                        name: 'Enhancements',
                        desc: 'Tells the model:\n- It\'s a Linux sidebar assistant\n- Be brief and use bullet points',
                        initValue: JanService.assistantPrompt,
                        onChange: (self, newValue) => {
                            JanService.assistantPrompt = newValue;
                        },
                    }),
                ]
            })
        ]
    })
});

export const OpenaiApiKeyInstructions = () => Box({
    homogeneous: true,
    children: [Revealer({
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        setup: (self) => self
            .hook(JanService, (self, hasKey) => {
                self.revealChild = (JanService.key.length == 0);
            }, 'hasKey')
        ,
        child: Button({
            child: Label({
                useMarkup: true,
                wrap: true,
                className: 'txt sidebar-chat-welcome-txt',
                justify: Gtk.Justification.CENTER,
                label: 'An API key is required\nYou can grab one <u>here</u>, then enter it below'
            }),
            setup: setupCursorHover,
            onClicked: () => {
                Utils.execAsync(['bash', '-c', `xdg-open ${JanService.getKeyUrl}`]);
            }
        })
    })]
});

const JanWelcome = () => Box({
    vexpand: true,
    homogeneous: true,
    child: Box({
        className: 'spacing-v-15',
        vpack: 'center',
        vertical: true,
        children: [
            JanInfo(),
            OpenaiApiKeyInstructions(),
            JanSettings(),
        ]
    })
});

export const janContent = Box({
    className: 'spacing-v-5',
    vertical: true,
    setup: (self) => self
        .hook(JanService, (box, id) => {
            const message = JanService.messages[id];
            if (!message) return;
            box.add(JanMessage(message, `Model (${JanService.providers[JanService.providerID]['name']})`))
        }, 'newMsg')
    ,
});

const clearjan = () => {
    JanService.clear();
    const children = janContent.get_children();
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        child.destroy();
    }
}

const CommandButton = (command) => Button({
    className: 'sidebar-chat-chip sidebar-chat-chip-action txt txt-small',
    onClicked: () => sendMessage(command),
    setup: setupCursorHover,
    label: command,
});

export const janCommands = Box({
    className: 'spacing-m-5',
    children: [
        Box({ hexpand: true }),
        CommandButton('/chat'), // set iin chat mode
        CommandButton('/threads'), // get threads
        CommandButton('/model'), // switch model
        CommandButton('/models/download'), // download model
        CommandButton('/models'), //list models
        CommandButton('/clear'),
    ]
});

export const sendMessage = (text) => {
    // Check if text or API key is empty
    if (text.length == 0) return;
    if (JanService.key.length == 0) {
        JanService.key = text;
        janContent.add(SystemMessage(`Key saved to\n\`${JanService.keyPath}\``, 'API Key', janView));
        text = '';
        return;
    }
    // Commands
    if (text.startsWith('/')) {
        if (text.startsWith('/clear')) clearjan();
        else if (text.startsWith('/model')) janContent.add(SystemMessage(`Currently using \`${JanService.modelName}\``, '/model', janView))
        else if (text.startsWith('/prompt') ||text.startsWith('/chat') ) {
            const firstSpaceIndex = text.indexOf(' ');
            const prompt = text.slice(firstSpaceIndex + 1);
            if (firstSpaceIndex == -1 || prompt.length < 1) {
                janContent.add(SystemMessage(`Usage: \`/prompt MESSAGE\``, '/prompt', janView))
            }
            else {
                JanService.addMessage('user', prompt)
            }
        }
        else if (text.startsWith('/key')) {
            const parts = text.split(' ');
            if (parts.length == 1) janContent.add(SystemMessage(
                `Key stored in:\n\`${JanService.keyPath}\`\nTo update this key, type \`/key YOUR_API_KEY\``,
                '/key',
                janView));
            else {
                JanService.key = parts[1];
                janContent.add(SystemMessage(`Updated API Key at\n\`${JanService.keyPath}\``, '/key', janView));
            }
        }
        else if (text.startsWith('/test'))
            janContent.add(SystemMessage(markdownTest, `Markdown test`, janView));
        else
            janContent.add(SystemMessage(`Invalid command.`, 'Error', janView))
    }
    else {
        JanService.send(text);
    }
}

export const janView = Box({
    vertical: true,
    children: [
        ProviderSwitcher(),
        Scrollable({
            className: 'sidebar-chat-viewport',
            vexpand: true,
            child: Box({
                vertical: true,
                children: [
                    JanWelcome(),
                    janContent,
                ]
            }),
            setup: (scrolledWindow) => {
                // Show scrollbar
                scrolledWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                const vScrollbar = scrolledWindow.get_vscrollbar();
                vScrollbar.get_style_context().add_class('sidebar-scrollbar');
                // Avoid click-to-scroll-widget-to-view behavior
                Utils.timeout(1, () => {
                    const viewport = scrolledWindow.child;
                    viewport.set_focus_vadjustment(new Gtk.Adjustment(undefined));
                })
                // Always scroll to bottom with new content
                const adjustment = scrolledWindow.get_vadjustment();
                adjustment.connect("changed", () => {
                    if(!chatEntry.hasFocus) return;
                    adjustment.set_value(adjustment.get_upper() - adjustment.get_page_size());
                })
            }
        })
    ]
});