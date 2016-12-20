/*
 * FormMessenger v0.0.1
 * 
 */

var fm;
(function(fm){
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
        
        formCompleteCallback: null,
    }
    
    var fmCustomEvent = {
        userInputSubmit: "fm-user-input-submit",
        userInputUpdate: "fm-user-input-update",
        userInputKeyChange: "fm-user-input-key-change",
        onBubbleClick: "fm-on-bubble-click",
        flowUpdate: "fm-flow-update",
    };
    
    
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
    
    Tag.prototype.getBubbles = function() {
        var bubbles = [];
        if(this.element.value){
            bubbles.push(this.element.value);
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
                this.questions.push("Please provide us your " + this.element.getAttribute("name"));
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
                this.questions.push("Please provide us your " + this.attrName);
            }
        }
        return this.questions[Math.floor(Math.random() * this.questions.length)].trim();
    }
    
    TagGroup.prototype.getBubbles = function() {
        var bubbles = [];
        this.elements.forEach(function(elem) {
            bubbles.push(elem.value);
        });
        return bubbles;
    }
    
    TagGroup.prototype.getCheckedValues = function() {
        var values = [];
        this.elements.forEach(function(elem) {
            if(elem.checked) {
                values.push(elem.value);
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
        
        if(this.fmReference.isProcessing()){
            return false;
        }
        this.fmReference.processing = true;
        
        if(this.currentTag instanceof Tag) {
            var inputText = event.detail.value.trim();
            
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
        } else if(this.currentTag instanceof TagGroup) {
            inputText = this.currentTag.getCheckedValues().join(", ");
        }
        
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputUpdate, {
            detail: inputText,
        }));

        setTimeout(function() {
            return self.nextStep();
        }, 250);
    }
    
    FlowManager.prototype.onBubbleClick = function(event) {
        var value = event.detail.value;
        var isChecked = event.detail.isChecked;
        
        if(this.currentTag instanceof Tag) {
            this.userInputSubmit(event);
        } else if(this.currentTag instanceof TagGroup) {
            this.currentTag.setInputValue(value, isChecked);
            
            if(this.currentTag.type == "radio") {
                this.userInputSubmit(event);
            }
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
        chatElement.className = ("fm-chat-element fm-user fm-clearfix " + defaultOptions.chatElementClass).trim();
        chatElement.textContent = text;
        this.el.appendChild(chatElement);
        
        this.scrollToBottom();
    }
    
    ChatList.prototype.buildBotChatElement = function(text) {
        var chatElement = document.createElement("div");
        chatElement.className = ("fm-chat-element fm-bot fm-clearfix " + defaultOptions.chatElementClass).trim();
        chatElement.textContent = text;
        this.el.appendChild(chatElement);
        
        this.scrollToBottom();
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
        this.filterableBubbles = true;
        
        this.el = document.createElement("div");
        this.el.id = "fmBubbleList";
        this.el.className = (defaultOptions.bubbleListClass).trim();
        
        this.userInputKeyChangeCallback = this.userInputKeyChange.bind(this);
        document.addEventListener(fmCustomEvent.userInputKeyChange, this.userInputKeyChangeCallback, false);
        
        return this;
    }
    
    BubbleList.prototype.userInputKeyChange = function(event) {
        if(this.bubbles.length > 0 && this.filterableBubbles) {
            var filteredBubbles = [];
            if(event.detail){
                this.bubbles.forEach(function(bubble) {
                    if(event.detail && bubble.toLowerCase().indexOf(event.detail.toLowerCase()) !== -1){
                        filteredBubbles.push(bubble);
                    }
                });
            } else {
                filteredBubbles = this.bubbles;
            }
            this.renderBubbles(filteredBubbles);
        }
    }
    
    BubbleList.prototype.prePopulateBubble = function(tag) {
        var self = this;
        this.bubbles = tag.getBubbles();
        this.filterableBubbles = tag instanceof Tag ? false : true;
        this.renderBubbles();
    }
    
    BubbleList.prototype.clearBubbles = function() {
        this.bubbles = [];
        this.renderBubbles();
    }
    
    BubbleList.prototype.renderBubbles = function(bubbles) {
        var self = this, bubbles = bubbles || this.bubbles;
        while (this.el.hasChildNodes()) {
            this.el.removeChild(this.el.lastChild);
        }
        if(bubbles.length > 0){
            bubbles.forEach(function(text) {
                var bubbleElement = document.createElement("div");
                bubbleElement.className = ("fm-bubble-element " + defaultOptions.bubbleElementClass).trim();
                bubbleElement.textContent = text;
                self.el.appendChild(bubbleElement);
                
                bubbleElement.addEventListener("click", function() {
                    self.handleBubbleClick.call(this, text);
                }, false);
            });
        }
    }
    
    BubbleList.prototype.handleBubbleClick = function(text) {
        this.classList.toggle("selected");
        document.dispatchEvent(new CustomEvent(fmCustomEvent.onBubbleClick, {
            detail: {
                value: text,
                isChecked: this.classList.contains("selected")
            }
        }));
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
        if(this.disabled) {
            return false;
        }
        document.dispatchEvent(new CustomEvent(fmCustomEvent.userInputSubmit, {
            detail: {value: this.inputEl.value}
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
    
    
    // #####
    // ##### FormMessenger
    // #####
    var FormMessenger = function (options) {
        if (!options.formEl) {
            throw new Error("Conversational Form error, Invalid formEl.");
        }
        
        var self = this;
        this.options = Object.assign({}, defaultOptions, options);
        this.formEl = options.formEl;
        this.containerEl = options.containerEl ? options.containerEl : document.body;
        this.tags = [];
        this.currentResponse = "";
        this.processing = false;
        
        //build UI
        this.buildUI();
        
        this.onFlowUpdateCallback = this.onFlowUpdate.bind(this);
        document.addEventListener(fmCustomEvent.flowUpdate, this.onFlowUpdateCallback, false);
        
        setTimeout(function() {
            return self.initForm(options.formEl);
        }, 0);
    }
    
    FormMessenger.prototype.isProcessing = function() {
        return this.processing === true;
    }
    
    FormMessenger.prototype.initForm = function(formEl) {
        this.formEl = formEl;
        
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
        
        if(currentTag instanceof Tag) {
            this.userInput.hideUserInput(currentTag.isInputSensitive());
            this.userInput.setPlaceHolder(currentTag.getPlaceHolder());
            this.userInput.focusInputBox();
        }
        
        //TODO propulate values
        this.bubbleEl.prePopulateBubble(currentTag);
        
        if(currentTag instanceof TagGroup) {
            this.userInput.setPlaceHolder("Search");
        }
        
        this.processing = false;
    }
    
    FormMessenger.prototype.doSubmitForm = function() {
        if(this.formCompleteCallback && typeof this.formCompleteCallback === "function"){
            this.formCompleteCallback();
        } else {
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
    }
    
    FormMessenger.prototype.setCurrentResponse = function(response) {
        this.userInput.clearInput();
        this.currentResponse = response;
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