# FormMessenger.js

FormMessenger.js is a javascript plugin that transforms HTML forms into a conversational chat room. 

### Setup

HTML 

```html
<link rel="stylesheet" href="css/formmessenger.min.css">
<script src="js/formmessenger.min.js"></script>
```

```html
<div id="fm-container"></div>
<form name="signup" id="fm" method="post" action="signup">
	<input type="text" name ="name" placeholder="Full Name"
    	fm-questions="May I know your name?">
	<input type="email" name="email" placeholder="Email Address"
		fm-questions="Hi {{previousResponse}}, what's your email?">
	<input type="password" name="password" placeholder="Password" 
    	fm-questions="Secure your account now. What's your password?">
	<input type="submit" name="submit">
</form>
```
The plugin is automatically initiated by assigning ID `#fm` to a HTML form. 

The generated chat room will be appended in `<body>` if ID `#fm-container` is not assigned.

HTML tags, attribules, id features:
- `#fm-container` : The container of the created chat room
- `#fm` : The form ID to initiate the the transformation 
- `fm-disabled` : To be excluded from the questions
- `fm-questions` : Questions that will be asked for the input
- `input/button[type=submit]` : Input / button is needed to submit the form

### Options / configurations:

- `previousResponsePattern` : Pattern of previous response to show in next question
- `chatListClass` : Class to be inserted into chat list div
- `chatElementClass` : Class to be inserted into chat response div
- `inputContainerClass` : Class to be inserted into user input container div
- `inputBoxClass` : Class to be inserted into user input box
- `inputButtonClass` : Class to be inserted into user input submit button

### Future improvements

- Handle tag group
- Add validation to each question
- Communication with JQuery Ajax Result
- Continuation chat from the next form