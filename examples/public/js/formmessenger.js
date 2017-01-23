/*
 * FormMessenger v0.3.5
 * 
 */

var fm;
(function (fm) {
    "use strict";
    
    var defaultOptions = {
        chatListClass: "",
        chatElementClass: "",
        bubbleListClass: "",
        bubbleElementClass: "",
        inputContainerClass: "",
        inputBoxClass: "",
        inputButtonClass: "",
        
        previousResponsePattern: "{{previousResponse}}",
        
        humanized: true,
        speedPerCharacter: 25,
        greetingText: null,
        
        formCompleteCallback: null,
        formSubmissionText: null,
        
        formValidation: {
            'email': function (value) {
                if (!(/^\w+([\.\-]?\ w+)*@\w+([\.\-]?\ w+)*(\.\w{2,3})+$/.test(value))) {
                    this.setErrorAndReply("Please provide a valid email.");
                }
            },
//            'password': function (value) {
//                // at least one number, one lowercase
//                // at least six characters
//                if (!(/(?=.*\d)(?=.*[a-z]).{6,}/.test(value))) {
//                    this.setErrorAndReply("Password must contain one number, one lowercase and at least 6 in length.");
//                }
//            },
//            'interest': function (values) {
//                // at least 2 selections
//                if (values instanceof Array && values.length < 1) {
//                    this.setErrorAndReply("Please select at least one.");
//                }
//            }
        }
    }
    
    var fmCustomEvent = {
        userInputSubmit: "fm-user-input-submit",
        userInputUpdate: "fm-user-input-update",
        userInputKeyChange: "fm-user-input-key-change",
        onBubbleClick: "fm-on-bubble-click",
        onUserInputError: "fm-user-input-error",
        flowUpdate: "fm-flow-update"
    };
    
    var dictionaryText = {
        tagNameRequest: "Please provide us your {tagName}",
        formSelectionQuestion: "Which do you want to proceed?",
        formYesNoQuestion: "Would you like to proceed to {label}",
        notAvailableResponse: "Not available",
    };
    
    
    // #####
    // ##### Util
    // #####
    var Util = function(fmReference) {
        this.fmReference = fmReference;
    }
    
    Util.prototype.calculateTypingSpeed = function(text) {
        return text.length * this.fmReference.options.speedPerCharacter;
    }
    
    
    // #####
    // ##### GlobalBubble
    // #####
    var GlobalBubble = function(fmReference) {
        this.fmReference = fmReference;
        this.inputCache = {};
    }
    
    GlobalBubble.prototype.store = function(name, value) {
        if(!this.inputCache.hasOwnProperty(name)) {
            this.inputCache[name] = [];
        }
        if(this.inputCache[name].indexOf(value) <= -1) {
            this.inputCache[name].push(value);
        }
    }
    
    GlobalBubble.prototype.retrieve = function(name) {
        if(this.inputCache.hasOwnProperty(name)) {
            return this.inputCache[name];
        }
        return [];
    }
    
    
    // #####
    // ##### TagBase
    // #####
    var TagBase = function(element) {}
    
    //check tag
    TagBase.isTagValid = function(element) {
        if(element.hasAttribute("fm-disabled")){
            return false;
        }
        if(["hidden", "submit", "button"].indexOf(element.getAttribute("type")) >= 0) {
            return false;
        }
        if(["true", "disabled"].indexOf(element.getAttribute('disabled')) >= 0){
            return false;
        }
        if(element.tagName == "button") {
            return false;
        }
        return true;
    }

    //check if tag group
    TagBase.isTagGroup = function(element) {
        if(["radio", "checkbox"].indexOf(element.getAttribute("type")) >= 0) {
            return true;
        }
        return false;
    }
    
    
    // #####
    // ##### Tag
    // #####
    var Tag = function(element) {
        var self = this;
        TagBase.call(this);
        
        this.element = element;
    }
    
    // inherit parent
    Tag.prototype = Object.create(TagBase.prototype);

    // correct the constructor pointer
    Tag.prototype.constructor = Tag;
    
    Tag.prototype.getAttrName = function() {
        return this.element.getAttribute("name");
    }
    
    Tag.prototype.setInputValue = function(value) {
        this.element.value = value;
    }
    
    Tag.prototype.isInputSensitive = function() {
        if(this.element.getAttribute("type") == "password" || this.element.hasAttribute("fm-sensitive")){
            return true;
        }
        return false;
    }
    
    Tag.prototype.getPlaceHolder = function() {
        return this.element.getAttribute("placeholder");
    }
    
    Tag.prototype.getBubbles = function(globalBubble) {
        var bubbles = [];
        if(!this.element.hasAttribute("fm-nobubble") && !this.isInputSensitive()) {
            var cacheBubbles = globalBubble.retrieve(this.getAttrName());
            if(this.element.value && cacheBubbles.indexOf(this.element.value) <= -1) {
                cacheBubbles.push(this.element.value);
            }
            if(cacheBubbles) {
                cacheBubbles.forEach(function(elem) {
                    bubbles.push({
                        value: elem,
                        label: elem,
                    });
                });
            }
        }
        
        return bubbles;
    }
    
    Tag.prototype.getQuestion = function() {
        if(!this.questions || this.questions.length <= 0) {
            this.questions = [];
            if(this.element && this.element.getAttribute("fm-questions")){
                this.questions = this.element.getAttribute("fm-questions").split("|");
            }
            if(this.questions.length <= 0) {
                this.questions.push(dictionaryText.tagNameRequest.replace("{tagName}", this.element.getAttribute("name")));
            }
        }
        return this.questions[Math.floor(Math.random() * this.questions.length)].trim();
    }
    
    
    // #####
    // ##### Tag Group (radio & checkbox)
    // #####
    var TagGroup = function(attrName, type) {
        var self = this;
        TagBase.call(this);
        
        this.attrName = attrName;
        this.type = type;
        this.elements = [];
    }
    
    // inherit parent
    TagGroup.prototype = Object.create(TagBase.prototype);

    // correct the constructor pointer
    TagGroup.prototype.constructor = TagGroup;
    
    TagGroup.prototype.getAttrName = function() {
        return this.attrName;
    }
    
    TagGroup.prototype.addElement = function(element) {
        this.elements.push(element);
    }
    
    TagGroup.prototype.setInputValue = function(value, isChecked) {
        this.elements.forEach(function(elem) {
            if(elem.getAttribute("value") == value) {
                elem.checked = isChecked;
            }
        });
    }
    
    TagGroup.prototype.getQuestion = function() {
        var self = this;
        if(!this.questions || this.questions.length <= 0) {
            this.questions = [];
            this.elements.some(function(elem) {
                var question = elem.getAttribute("fm-questions");
                if(question) {
                    self.questions = question.split("|");
                    return true;
                }
            });
            if(this.questions.length <= 0) {
                this.questions.push(dictionaryText.tagNameRequest.replace("{tagName}", this.attrName));
            }
        }
        return this.questions[Math.floor(Math.random() * this.questions.length)].trim();
    }
    
    TagGroup.prototype.getBubbles = function(globalBubble) {
        var bubbles = [];
        this.elements.forEach(function(elem) {
            bubbles.push({
                value: elem.value,
                label: elem.getAttribute("fm-label") || elem.value,
                isChecked: elem.checked
            });
        });
        return bubbles;
    }
    
    TagGroup.prototype.getCheckedValuesForMsg = function() {
        var values = [];
        this.elements.forEach(function(elem) {
            if(elem.checked) {
                var label = elem.getAttribute("fm-label") || elem.value;
                values.push(label);
            }
        });
        return values;
    }
    
    
    // #####
    // ##### FlowManager
    // #####
    var FlowManager = function(options) {
        this.step = 0;
        this.maxSteps = options.tags.length;
        this.tags = options.tags;
        this.fmReference = options.fmReference;
        
        this.repeatStep = false;
        
        //events
        this.userInputSubmitCallback = this.userInputSubmit.bind(this);
        document.addEventListener(fmCustomEvent.userInputSubmit, this.userInputSubmitCallback, false);
        
        this.onBubbleClickCallback = this.onBubbleClick.bind(this);
        document.addEventListener(fmCustomEvent.onBubbleClick, this.onBubbleClickCallback, false);
        
        return this;
    }
    
    Object.defineProperty(FlowManager.prototype, "currentTag", {
        get: function() {
            return this.tags[this.step];
        },
        enumerable: true,
        configurable: true,
    })
    
    FlowManager.prototype.start = function() {
        this.processStep();
        return this;
    }
    
    FlowManager.prototype.nextStep = function() {
        this.step++;
        this.processStep();
    }
    
    FlowManager.prototype.processStep = function() {
        if(this.step == this.maxSteps){
            this.fmReference.doSubmitForm();
        } else {
            this.step %= this.maxSteps;
            this.showStep();
        }
    }
    
    FlowManager.prototype.showStep = function() {
        var self = this;
        
        document.dispatchEvent(new CustomEvent(fmCustomEvent.flowUpdate, {
            detail: self.currentTag,
        }));
    }
    
    FlowManager.prototype.userInputSubmit = function(event) {
        var self = this, value, displayText;
        this.repeatStep = false;
        
        if(this.fmReference.isProcessing()){
            return false;
        }
        this.fmReference.setProcessing(true);
        this.fmReference.bubbleEl.clearBubbles();
        
        if(this.currentTag instanceof Tag) {
            value = event.detail.value;
            displayText = value.trim();
            
            //set element value
            this.currentTag.setInputValue(displayText);
            
            //mask value if sensitive
            if(this.currentTag.isInputSensitive()){
                var newStr = "";
                for (var i = 0; i < displayText.length; i++) {
                    newStr += "*";
                }
                displayText = newStr;
            } else {
                //store globalBubble if not sensitive
                this.fmReference.globalBubble.store(this.currentTag.getAttrName(), displayText);
            }
        } else if(this.currentTag instanceof TagGroup) {
            value = this.currentTag.getCheckedValuesForMsg();
            displayText = value.join(", ");
        }
        
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputUpdate, {
            detail: displayText,
        }));
        
        if(this.validateInput(value) && !this.repeatStep) {
            setTimeout(function() {
                return self.nextStep();
            }, 250);
        }
    }
    
    FlowManager.prototype.onBubbleClick = function(event) {
        var value = event.detail.value;
        
        if(this.currentTag instanceof Tag) {
            this.userInputSubmit(event);
        } else if(this.currentTag instanceof TagGroup) {
            if(this.currentTag.type == "radio") {
                //radio check cannot be dismissed
                this.currentTag.setInputValue(value, true);
                this.userInputSubmit(event);
            } else {
                this.currentTag.setInputValue(value, event.detail.isChecked);
            }
        }
    }
    
    FlowManager.prototype.validateInput = function(value) {
        var tagName = this.currentTag.getAttrName();
        if(this.fmReference.options.formValidation.hasOwnProperty(tagName)){
            this.fmReference.options.formValidation[tagName].call(this, value);
        }
        return true;
    }
    
    FlowManager.prototype.setErrorAndReply = function(question) {
        this.repeatStep = true;
        document.dispatchEvent(new CustomEvent(fmCustomEvent.onUserInputError, {
            detail: question,
        }));
    }
    
    FlowManager.prototype.removeEventListener = function () {
        document.removeEventListener(fmCustomEvent.userInputSubmit, this.userInputSubmitCallback, false);
        this.userInputSubmitCallback = null;
        
        document.removeEventListener(fmCustomEvent.onBubbleClick, this.onBubbleClickCallback, false);
        this.onBubbleClickCallback = null;
    };
    
    
    // #####
    // ##### ChatList
    // #####
    var ChatList = function(fmReference) {
        this.fmReference = fmReference;
        this.humanized = fmReference.options.humanized;
        
        this.el = document.createElement("div");
        this.el.id = "fmChatList";
        this.el.className = (this.fmReference.options.chatListClass).trim();
        
        this.onUserInputUpdateCallback = this.onUserInputUpdate.bind(this);
        document.addEventListener(fmCustomEvent.userInputUpdate, this.onUserInputUpdateCallback, false);
        
        return this;
    }
    
    ChatList.prototype.onUserInputUpdate = function(event) {
        this.buildUserChatElement(event.detail);
        this.fmReference.setCurrentResponse(event.detail);
    }
    
    ChatList.prototype.buildUserChatElement = function(text) {
        var displaytext = text || dictionaryText.notAvailableResponse;
        var chatElement = document.createElement("div");
        chatElement.className = ("fm-chat-element fm-user fm-clearfix " + this.fmReference.options.chatElementClass).trim();
        chatElement.textContent = displaytext;
        
        if(!text) {
            chatElement.className += " skip";
        }
        
        this.el.appendChild(chatElement);

        this.scrollToBottom();
    }
    
    ChatList.prototype.buildBotChatElement = function(text, params) {
        if(text){
            var self = this, callback, type;
            if(typeof arguments[1] == "function") {
                callback = arguments[1];
            } else {
                type = arguments[1];
                callback = arguments[2];
            }
            
            var chatElement = document.createElement("div");
            chatElement.className = ("fm-chat-element fm-bot fm-clearfix " + this.fmReference.options.chatElementClass).trim();
            
            if(this.humanized) {
                chatElement.textContent = "...";
                setTimeout(function() {
                    chatElement.textContent = text;
                    if(type) {
                        chatElement.className += (" " + type);
                    }
                    if(callback && typeof callback == "function") {
                        callback.call(self.fmReference);
                    }
                }, this.fmReference.util.calculateTypingSpeed(text));
            } else {
                if(type) {
                    chatElement.className += (" " + type);
                }
                chatElement.textContent = text;
                if(callback && typeof callback == "function") {
                    callback.call(self.fmReference);
                }
            }

            this.el.appendChild(chatElement);
            this.scrollToBottom();
        }
    }
    
    ChatList.prototype.scrollToBottom = function() {
        this.el.scrollTop = this.el.scrollHeight - this.el.clientHeight;
    }
    
    
    // #####
    // ##### BubbleList
    // #####
    var BubbleList = function(fmReference) {
        this.fmReference = fmReference;
        this.bubbles = [];
        this.toggleable = false;
        
        this.el = document.createElement("div");
        this.el.id = "fmBubbleList";
        this.el.className = (this.fmReference.options.bubbleListClass).trim();
        
        this.userInputKeyChangeCallback = this.userInputKeyChange.bind(this);
        document.addEventListener(fmCustomEvent.userInputKeyChange, this.userInputKeyChangeCallback, false);
        
        return this;
    }
    
    BubbleList.prototype.userInputKeyChange = function(event) {
        if(this.bubbles.length > 0) {
            var filteredBubbles = [];
            if(event.detail){
                this.bubbles.forEach(function(bubble) {
                    if(event.detail && bubble.label.toLowerCase().indexOf(event.detail.toLowerCase()) !== -1){
                        filteredBubbles.push(bubble);
                    }
                });
            } else {
                filteredBubbles = this.bubbles;
            }
            this.renderBubbles(filteredBubbles);
        }
    }
    
    BubbleList.prototype.prePopulateInputBubble = function(tag, globalBubble) {
        this.reset();
        this.bubbles = tag.getBubbles(globalBubble);
        if(tag.type == "checkbox") {
            this.toggleable = true;
        }
        this.renderBubbles();
    }
    
    BubbleList.prototype.prePopulateLinkBubble = function(bubbles) {
        this.reset();
        this.bubbles = bubbles;
        this.renderBubbles();
    }
    
    BubbleList.prototype.clearBubbles = function() {
        this.reset();
        this.bubbles = [];
        this.renderBubbles();
    }
    
    BubbleList.prototype.renderBubbles = function(bubbles) {
        var self = this, bubbles = bubbles || this.bubbles;
        while (this.el.hasChildNodes()) {
            this.el.removeChild(this.el.lastChild);
        }
        if(bubbles.length > 0){
            bubbles.forEach(function(bubble) {
                var bubbleElement = document.createElement("div");
                bubbleElement.className = ("fm-bubble-element " + self.fmReference.options.bubbleElementClass).trim();
                bubbleElement.textContent = bubble.label;
                if(bubble.isChecked) {
                    bubbleElement.className += " selected";
                }
                if(self.toggleable) {
                    bubbleElement.className += " checkbox";
                }
                self.el.appendChild(bubbleElement);
                
                if(bubble.isFormSelection || bubble.isFormYes) {
                    bubbleElement.addEventListener("click", function() {
                        self.handleFormSelectionClick.call(self, bubble);
                    }, false);
                } else if(bubble.isFormNo) {
                    if(bubble.hasOwnProperty('callback') && typeof bubble.callback == "function") {
                        bubbleElement.addEventListener("click", function() {
                            self.handleFormNo.call(self, bubble);
                        }, false);
                    }
                } else {
                    bubbleElement.addEventListener("click", function() {
                        self.handleBubbleClick.call(this, bubble.value, self);
                    }, false);
                }
            });
        }
    }
    
    BubbleList.prototype.handleBubbleClick = function(value, bubbleList) {
        if(bubbleList.toggleable){
            this.classList.toggle("selected");
        } else {
            [].forEach.call(bubbleList.el.childNodes, function(el) {
                el.classList.remove("selected");
            });
            this.classList.add("selected");
        }
        
        document.dispatchEvent(new CustomEvent(fmCustomEvent.onBubbleClick, {
            detail: {
                value: value,
                isChecked: this.classList.contains("selected")
            }
        }));
    }
    
    BubbleList.prototype.onBubbleLinkClick = function(bubble) {
        if(this.fmReference.isProcessing()){
            return false;
        }
        this.fmReference.setProcessing(true);
        this.clearBubbles();
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputUpdate, {
            detail: bubble.label,
        }));
    }
    
    BubbleList.prototype.handleFormSelectionClick = function(bubble) {
        var self = this;
        this.onBubbleLinkClick(bubble);
        setTimeout(function() {
            self.fmReference.initForm(bubble.value);
        }, 250);
    }
    
    BubbleList.prototype.handleFormNo = function(bubble) {
        var self = this;
        this.onBubbleLinkClick(bubble);
        setTimeout(function() {
            bubble.callback.call(self.fmReference);
            self.fmReference.setProcessing(false);
        }, 250);
    }
    
    BubbleList.prototype.reset = function() {
        this.toggleable = false;
    }
    
    
    // #####
    // ##### UserInput
    // #####
    var UserInput = function(fmReference) {
        var self = this;
        this.fmReference = fmReference;
        this.disabled = false;
        this.referCurrentResponse = true;
        
        //build ui
        this.el = document.createElement("div");
        this.el.id = "fmInputContainer";
        this.el.className = (this.fmReference.options.inputContainerClass).trim();
        
        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.id = "fmInputBox";
        this.inputEl.className = (this.fmReference.options.inputBoxClass).trim();
        
        this.inputBtnEl = document.createElement("button");
        this.inputBtnEl.type = "button";
        this.inputBtnEl.id = "fmInputBtn";
        this.inputBtnEl.innerHTML = "Send";
        this.inputBtnEl.className = (this.fmReference.options.inputButtonClass).trim();
        
        this.el.appendChild(this.inputEl);
        this.el.appendChild(this.inputBtnEl);
        
        //build event
        this.onKeyUpCallback = this.onKeyUp.bind(this);
        this.inputEl.addEventListener("keyup", this.onKeyUpCallback, false);
        
        this.onEnterOrSubmitBtnCallback = this.onEnterOrSubmitBtn.bind(this);
        this.inputBtnEl.addEventListener("click", this.onEnterOrSubmitBtnCallback, false);
        
        return this;
    }
    
    UserInput.prototype.onKeyUp = function(event) {
        var self = this;
        if(this.disabled) {
            return false;
        }
        if(event.keyCode == 13) {
            this.onEnterOrSubmitBtn();
        } else if(event.keyCode == 38 && this.referCurrentResponse) {
            this.inputEl.value = this.fmReference.currentResponse;
        } else {
            document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputKeyChange, {
                detail: self.inputEl.value
            }));
        }
    }
    
    UserInput.prototype.onEnterOrSubmitBtn = function() {
        if(this.disabled) {
            return false;
        }
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputSubmit, {
            detail: {value: this.inputEl.value}
        }));
    }
    
    UserInput.prototype.hideUserInput = function(isTrue) {
        if(isTrue){
            this.referCurrentResponse = false;
            this.inputEl.setAttribute("type", "password");
        } else {
            this.inputEl.setAttribute("type", "text");
        }
    }
    
    UserInput.prototype.setPlaceHolder = function(placeholder) {
        this.inputEl.setAttribute("placeholder", placeholder);
    }
    
    UserInput.prototype.focusInputBox = function() {
        this.inputEl.focus();
    }
    
    UserInput.prototype.clearInput = function() {
        this.inputEl.value = "";
    }
    
    UserInput.prototype.setDisabled = function(isDisabled) {
        this.disabled = isDisabled ? true : false;
        if(isDisabled){
            this.inputEl.setAttribute("disabled", "disabled");
            this.inputBtnEl.setAttribute("disabled", "disabled");
        } else {
            this.inputEl.removeAttribute("disabled");
            this.inputBtnEl.removeAttribute("disabled");
        }
    }
    
    UserInput.prototype.reset = function() {
        this.referCurrentResponse = true;
        this.inputBtnEl.innerHTML = "Send";
        this.setDisabled(false);
    }
    
    UserInput.prototype.setInputBtnLabel = function(label) {
        this.inputBtnEl.innerHTML = label;
    }
    
    
    // #####
    // ##### FormMessenger
    // #####
    var FormMessenger = function (options) {
        if (!options.formEl && !options.formSelection) {
            throw new Error("Conversational Form error, Invalid formEl.");
        }
        
        var self = this;
        this.options = Object.assign({}, defaultOptions, options);
        this.formEl = options.formEl;
        this.containerEl = options.containerEl ? options.containerEl : document.body;
        this.util = new Util(this);
        this.tags = [];
        this.currentResponse = "";
        this.processing = false;
        
        this.globalBubble = new GlobalBubble(this);
        
        //build UI
        this.buildUI();
        
        this.onFlowUpdateCallback = this.onFlowUpdate.bind(this);
        document.addEventListener(fmCustomEvent.flowUpdate, this.onFlowUpdateCallback, false);
        
        this.onUserInputErrorCallback = this.onUserInputError.bind(this);
        document.addEventListener(fmCustomEvent.onUserInputError, this.onUserInputErrorCallback, false);
        
        var initFormCallback = function() {
            if(this.formEl) {
                //disable html validation
                this.formEl.setAttribute("novalidate", "");
                return self.initForm(self.formEl);
            } else if(options.formSelection) {
                self.setFormSelection(options.formSelection, options.formSelectionQuestion);
            }
        }
        
        var processGreetingText = function(greetingArray, i, mCallback, finalCallback) {
            var text = greetingArray[i];
            i++;
            if(i < greetingArray.length) {
                var callback = function() {
                    processGreetingText(greetingArray, i, null, finalCallback);
                }
            } else {
                callback = finalCallback;
            }
            self.setResponseWithClass(text, "greeting", callback);
        }
        
        if(this.options.greetingText) {
            if(Array.isArray(this.options.greetingText)) {
                processGreetingText(this.options.greetingText, 0, null, initFormCallback);
            } else if(typeof this.options.greetingText == "string") {
                this.setResponseWithClass(this.options.greetingText, "greeting", initFormCallback);
            }
        } else {
            setTimeout(function() {
                initFormCallback.call(this);
            }, 0);
        }
    }
    
    FormMessenger.prototype.isProcessing = function() {
        return this.processing === true;
    }
    
    FormMessenger.prototype.setProcessing = function(isProcessing) {
        this.processing = isProcessing;
    }
    
    FormMessenger.prototype.reset = function() {
        this.tags = [];
        this.currentResponse = "";
        this.processing = false;
    }
    
    FormMessenger.prototype.initForm = function(formEl) {
        this.formEl = formEl;
        this.reset();
        
        var fields = [].slice.call(this.formEl.querySelectorAll("input, button"), 0);
        var processedTagsGroup = {};
        for(var i = 0; i < fields.length; i++) {
            var element = fields[i];
            if(TagBase.isTagValid(element)){
                if(!TagBase.isTagGroup(element)){
                    this.tags.push(new Tag(element));
                }
                else{
                    var attrName = element.getAttribute("name");
                    var attrType = element.getAttribute("type");
                    if(!processedTagsGroup.hasOwnProperty(attrName)){
                        var tagGroup = new TagGroup(attrName, attrType);
                        this.tags.push(tagGroup);
                        processedTagsGroup[attrName] = tagGroup;
                    }
                    //add element to group
                    processedTagsGroup[attrName].addElement(element);
                }
            }
        }
        
        //remove existing flowManager
        if(this.flowManager) {
            this.flowManager.removeEventListener();
        }
        
        this.flowManager = new FlowManager({
            fmReference: this,
            tags: this.tags
        }).start();
    }
    
    FormMessenger.prototype.buildUI = function() {
        var self = this;
        
        this.el = document.createElement("div");
        this.el.id = "form-messenger";
        this.containerEl.appendChild(this.el);
        
        //chat list
        this.chatEl = new ChatList(this);
        this.el.appendChild(this.chatEl.el);
        
        //bubble list
        this.bubbleEl = new BubbleList(this);
        this.el.appendChild(this.bubbleEl.el);
        
        //input element
        this.userInput = new UserInput(this);
        this.el.appendChild(this.userInput.el);
    }
    
    FormMessenger.prototype.onFlowUpdate = function(event) {
        var currentTag = event.detail;
        
        var text = currentTag.getQuestion().split(this.options.previousResponsePattern).join(this.currentResponse);
        this.chatEl.buildBotChatElement(text, function() {
            this.userInput.reset();
        
            if(currentTag instanceof Tag) {
                this.userInput.hideUserInput(currentTag.isInputSensitive());
                this.userInput.setPlaceHolder(currentTag.getPlaceHolder());
                this.userInput.focusInputBox();
            } else if(currentTag instanceof TagGroup) {
                this.userInput.setPlaceHolder("Search");
            }

            //TODO propulate values
            this.bubbleEl.prePopulateInputBubble(currentTag, this.globalBubble);

            this.setProcessing(false);
        });
    }
    
    FormMessenger.prototype.doSubmitForm = function() {
        if(this.formCompleteCallback && typeof this.formCompleteCallback === "function"){
            this.formCompleteCallback.call(this);
        } else {
            this.userInput.setDisabled(true);
            var formTextCallback = function() {
                //cannot use .submit();
                var fields = [].slice.call(this.formEl.querySelectorAll("input, button"), 0);
                if(fields.length > 0){
                    for(var i = 0; i < fields.length; i++){
                        if(fields[i].getAttribute("type") == "submit"){
                            fields[i].click();
                        }
                    }
                } else {
                    this.formEl.submit();
                }
            }
            
            if(this.options.formSubmissionText){
                this.chatEl.buildBotChatElement(this.options.formSubmissionText, formTextCallback);
            } else {
                formTextCallback.call(this);
            }
        }
        
        this.setProcessing(false);
    }
    
    FormMessenger.prototype.setCurrentResponse = function(response) {
        this.userInput.clearInput();
        this.currentResponse = response;
    }
    
    FormMessenger.prototype.onUserInputError = function(event) {
        this.chatEl.buildBotChatElement(event.detail, "error", function() {
            this.setProcessing(false);
        });
    }
    
    FormMessenger.prototype.setFormSelection = function(formSelection, question) {
        this.userInput.reset();
        var question = question || dictionaryText.formSelectionQuestion;
        this.chatEl.buildBotChatElement(question, function() {
            var formBubbles = [];
            for(var label in formSelection) {
                formBubbles.push({
                    label: label,
                    value: formSelection[label],
                    isFormSelection: true
                });
            }
            this.bubbleEl.prePopulateLinkBubble(formBubbles);
        });
    }
    
    FormMessenger.prototype.setFormYesNo = function(form, question, noCallback) {
        this.userInput.reset();
        var question = question || dictionaryText.formYesNoQuestion.repeat("{label}", form.label);
        this.chatEl.buildBotChatElement(question, function() {
            var yesNoBubbles = [];
            yesNoBubbles.push({
                label: "Yes",
                value: form.elem,
                isFormYes: true
            });

            yesNoBubbles.push({
                label: "No",
                value: null,
                callback: noCallback,
                isFormNo: true
            });
            
            this.bubbleEl.prePopulateLinkBubble(yesNoBubbles);
        });
    }
    
    FormMessenger.prototype.setErrorResponse = function(msg, callback) {
        this.setResponseWithClass(msg, "error", callback);
    }
    
    FormMessenger.prototype.setInfoResponse = function(msg, callback) {
        this.setResponseWithClass(msg, "info", callback);
    }
    
    FormMessenger.prototype.setResponseWithClass = function(msg, msgClass, callback) {
        this.chatEl.buildBotChatElement(msg, msgClass, callback);
    }
    
    fm.FormMessenger = FormMessenger;
})(fm || (fm = {}))

var FormMessenger = fm.FormMessenger;

window.addEventListener("load", function() {
    var formEl = document.querySelector("#fm-initiator");
    var containerEl = document.querySelector("#fm-container");
    if(formEl) {
        window.FormMessenger = new FormMessenger({
            formEl: formEl,
            containerEl: containerEl,
        });
    }
});