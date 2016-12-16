/*
 * FormMessenger v0.0.1
 * 
 */

(function(){
    "use strict";
    
    var defaultOptions = {
        chatListClass: "",
        chatElementClass: "",
        bubbleListClass: "",
        bubbleElementClass: "",
        inputContainerClass: "",
        inputBoxClass: "",
        inputButtonClass: "",
        
        previousResponsePattern: "{{previousResponse}}"
    }
    
    var fmCustomEvent = {
        userInputSubmit: "fm-user-input-submit",
        userInputKeyChange: "fm-user-input-key-change",
        userInputUpdate: "fm-user-input-update",
        
        flowUpdate: "fm-flow-update",
    };
    
    // #####
    // ##### Tag
    // #####
    var Tag = function(element) {
        var self = this;
        this.element = element;
    }
    
    //check tag
    Tag.isTagValid = function(element) {
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
    Tag.isTagGroup = function(element) {
        if(["radio", "checkbox"].indexOf(element.getAttribute("type")) >= 0) {
            return true;
        }
        return false;
    }
    
    Tag.prototype.getQuestion = function() {
        if(!this.questions) {
            this.questions = [];
            if(this.element.getAttribute("fm-questions")){
                this.questions = this.element.getAttribute("fm-questions").split("|");
            }
            if(this.questions.length <= 0) {
                this.questions.push("Please provide us your " + this.element.getAttribute("name"));
            }
        }
        return this.questions[Math.floor(Math.random() * this.questions.length)].trim();
    }
    
    Tag.prototype.setInputValue = function(value) {
        this.element.value = value;
    }
    
    Tag.prototype.isInputSensitive = function() {
        if(this.element.getAttribute("type") == "password"){
            return true;
        }
        return false;
    }
    
    Tag.prototype.getPlaceHolder = function() {
        return this.element.getAttribute("placeholder");
    }
    
    
    // #####
    // ##### Tag Group (radio & checkbox)
    // #####
    var TagGroup = function(attrName) {
        var self = this;
        this.attrName = attrName;
        this.elements = [];
    }
    
    TagGroup.prototype.addElement = function(element) {
        this.elements.push(element);
    }
    
    
    // #####
    // ##### FlowManager
    // #####
    var FlowManager = function(options) {
        this.step = 0;
        this.maxSteps = options.tags.length;
        this.tags = options.tags;
        this.fmReference = options.fmReference;
        
        //events
        this.userInputSubmitCallback = this.userInputSubmit.bind(this);
        document.addEventListener(fmCustomEvent.userInputSubmit, this.userInputSubmitCallback, false);
        
        this.userInputKeyChangeCallback = this.userInputKeyChange.bind(this);
        document.addEventListener(fmCustomEvent.userInputKeyChange, this.userInputKeyChangeCallback, false);
        
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
        var self = this;
        var inputText = event.detail.trim();
        
        if(this.currentTag instanceof Tag) {
            //set element value
            this.currentTag.setInputValue(inputText);
            
            //mask value if sensitive
            if(this.currentTag.isInputSensitive()){
                var newStr = "";
                for (var i = 0; i < inputText.length; i++) {
                    newStr += "*";
                }
                inputText = newStr;
            }
            
            document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputUpdate, {
                detail: inputText,
            }));
            
            setTimeout(function() {
                return self.nextStep();
            }, 250);
        }
    }
    
    FlowManager.prototype.userInputKeyChange = function(event) {
        if(this.currentTag instanceof TagGroup) {
            console.log("Bubble changed");
        }
    }
    
    
    // #####
    // ##### ChatList
    // #####
    var ChatList = function(fmReference) {
        this.fmReference = fmReference;
        
        this.el = document.createElement("div");
        this.el.id = "fmChatList";
        this.el.className = (defaultOptions.chatListClass).trim();
        
        this.onUserInputUpdateCallback = this.onUserInputUpdate.bind(this);
        document.addEventListener(fmCustomEvent.userInputUpdate, this.onUserInputUpdateCallback, false);
        
        return this;
    }
    
    ChatList.prototype.onUserInputUpdate = function(event) {
        this.buildUserChatElement(event.detail);
        this.fmReference.setCurrentResponse(event.detail);
    }
    
    ChatList.prototype.buildUserChatElement = function(text) {
        var chatElement = document.createElement("div");
        chatElement.className = ("fm-chat-element fm-user fm-clearfix" + defaultOptions.chatElementClass).trim();
        chatElement.textContent = text;
        this.el.appendChild(chatElement);
    }
    
    ChatList.prototype.buildBotChatElement = function(text) {
        var chatElement = document.createElement("div");
        chatElement.className = ("fm-chat-element fm-bot fm-clearfix" + defaultOptions.chatElementClass).trim();
        chatElement.textContent = text;
        this.el.appendChild(chatElement);
    }
    
    
    // #####
    // ##### BubbleList
    // #####
    var BubbleList = function(fmReference) {
        this.fmReference = fmReference;
        
        this.el = document.createElement("div");
        this.el.id = "fmBubbleList";
        this.el.className = (defaultOptions.bubbleListClass).trim();
        
        return this;
    }
    
    
    // #####
    // ##### UserInput
    // #####
    var UserInput = function(fmReference) {
        var self = this;
        this.fmReference = fmReference;
        this.disabled = false;
        
        //build ui
        this.el = document.createElement("div");
        this.el.id = "fmInputContainer";
        this.el.className = (defaultOptions.inputContainerClass).trim();
        
        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.id = "fmInputBox";
        this.inputEl.className = (defaultOptions.inputBoxClass).trim();
        
        this.inputBtnEl = document.createElement("button");
        this.inputBtnEl.type = "button";
        this.inputBtnEl.id = "fmInputBtn";
        this.inputBtnEl.innerHTML = "Send";
        this.inputBtnEl.className = (defaultOptions.inputButtonClass).trim();
        
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
        } else {
            document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputKeyChange, {
                detail: self.inputEl.value
            }));
        }
    }
    
    UserInput.prototype.onEnterOrSubmitBtn = function() {
        var self = this;
        if(this.disabled) {
            return false;
        }
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputSubmit, {
            detail: self.inputEl.value
        }));
    }
    
    UserInput.prototype.hideUserInput = function(isTrue) {
        if(isTrue){
            this.inputEl.setAttribute("type", "password");
        } else {
            this.inputEl.setAttribute("type", "text");
        }
    }
    
    UserInput.prototype.setPlaceHolder = function(placeholder) {
        this.inputEl.setAttribute("placeholder", placeholder);
    }
    
    UserInput.prototype.setInputGroup = function(isTrue) {
        if(isTrue){
            this.inputBtnEl.style.display = 'none';
        } else {
            this.inputEl.focus();
            this.inputBtnEl.style.display = null;
        }
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
    
    
    // #####
    // ##### FormMessenger
    // #####
    var FormMessenger = function (options) {
        if (!options.formEl) {
            throw new Error("Conversational Form error, the formEl needs to be defined.");
        }
        
        var self = this;
        this.options = Object.assign({}, defaultOptions, options);
        this.formEl = options.formEl;
        this.containerEl = options.containerEl ? options.containerEl : document.body;
        this.tags = [];
        this.currentResponse = "";
        
        //build UI
        this.buildUI();
        
        this.onFlowUpdateCallback = this.onFlowUpdate.bind(this);
        document.addEventListener(fmCustomEvent.flowUpdate, this.onFlowUpdateCallback, false);
        
        setTimeout(function() {
            return self.initForm(options.formEl);
        }, 0);
    }
    
    FormMessenger.prototype.initForm = function(formEl) {
        this.formEl = formEl;
        
        var fields = [].slice.call(this.formEl.querySelectorAll("input, button"), 0);
        var processedTagsGroup = {};
        for(var i = 0; i < fields.length; i++) {
            var element = fields[i];
            if(Tag.isTagValid(element)){
                if(!Tag.isTagGroup(element)){
                    this.tags.push(new Tag(element));
                }
                else{
                    var attrName = element.getAttribute("name");
                    if(!processedTagsGroup.hasOwnProperty(attrName)){
                        var tagGroup = new TagGroup(attrName);
//                        this.tags.push(tagGroup);
                        processedTagsGroup[attrName] = tagGroup;
                    }
                    //add element to group
                    processedTagsGroup[attrName].addElement(element);
                }
            }
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
        
        var text = currentTag.getQuestion().split(defaultOptions.previousResponsePattern).join(this.currentResponse);
        this.chatEl.buildBotChatElement(text);
        
        this.userInput.hideUserInput(currentTag.isInputSensitive());
        this.userInput.setPlaceHolder(currentTag.getPlaceHolder());
        this.userInput.setInputGroup(this.currentTag instanceof TagGroup);
    }
    
    FormMessenger.prototype.doSubmitForm = function() {
        this.chatEl.buildBotChatElement("Sending form...");
        this.userInput.setDisabled(true);
        
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
    
    FormMessenger.prototype.setCurrentResponse = function(response) {
        this.userInput.clearInput();
        this.currentResponse = response;
    }
    
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
    
})()