/*!
 * Weblocks-jQuery - javascript helper functions for Weblocks v0.0.6
 * https://github.com/html/weblocks-jquery
 */

// Taken from http://css-tricks.com/snippets/jquery/serialize-form-to-json/
jQuery.fn.serializeObject = function()
{
   var o = {};
   var a = this.serializeArray();
   jQuery.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
   });
   return o;
};

/*
 * This prevents javascript error, but does not any effect like with usual weblocks flashes.
 */
window.Effect = Effect = {
  Pulsate: function(){ return {};},
  BlindUp: function(){ return {};}
};

/*
 * This prevents javascript error and replaces weblocks focusFirstElement form functionality
 */
jQuery.fn.focusFirstElement = function(){
  if(jQuery(this).length){
    jQuery(this).find('input:first').focus();
  }
};

jQuery.fn.serializeObjectWithSubmit = function(){
  var ret = this.serializeObject();
  var submitElement = jQuery('input[type=submit][clicked=true]');
  ret[submitElement.attr('name')] = submitElement.val();

  return ret;
};

// Utilities
function updateElementBody(element, newBody) {
    element.update(newBody);
}

function updateElement(element, newElement) {
    var $newElement = jQuery(newElement);
    element.replaceWith($newElement);
}

function applySubmitClickEvent() {
  jQuery("form input[type=submit]")
    .unbind('click.weblocks-submit-event')
    .bind('click.weblocks-submit-event', function() {
        $("input[type=submit]", $(this).parents("form")).removeAttr("clicked");
        $(this).attr("clicked", "true");
    });
}

function selectionEmpty() {
    if(document.getSelection) {
	return document.getSelection() == "";
    } else if(document.selection && document.selection.createRange) {
	return document.selection.createRange().text == "";
    } else {
	return true;
    }
}

function addCss(cssCode) {
    var styleElement = document.createElement("style");
    styleElement.type = "text/css";
    if (styleElement.styleSheet) {
	styleElement.styleSheet.cssText = cssCode;
    } else {
	styleElement.appendChild(document.createTextNode(cssCode));
    }
    document.getElementsByTagName("head")[0].appendChild(styleElement);
}

function stopPropagation(event) {
    if(event.preventDefault) {
	event.stopPropagation();
    } else {
	event.cancelBubble = true;
    };
}

// Register global AJAX handlers to show progress
jQuery(document).ajaxStart(function() {
    try{
	  jQuery('#ajax-progress').html("<img src='/pub/images/progress.gif'>");
    }catch(e){
      window.console && console.log(e, e.message);
    }
});
jQuery(document).ajaxStop(function() {
    jQuery('#ajax-progress').html("");
});

function dirtyWidgetsToSortedArray(dirtyWidgets){
  var dirtyWidgetsArray = [];
  for(var i in dirtyWidgets) {
    dirtyWidgetsArray.push([i, dirtyWidgets[i]]);
  }

  dirtyWidgetsArray = dirtyWidgetsArray.sort(function(ar1, ar2){
      var match1 = +ar1[0].match(/\d+/);
      var match2 = +ar2[0].match(/\d+/);

      if(!match1){
        return 1;
      }else if(!match2){
        return -1;
      }

      var num1 = match1[0];
      var num2 = match2[0];

      return num1 > num2 ? 1 : -1;
  });

  return dirtyWidgetsArray;
}

function mapEachWidget(dirtyWidgets, fun){
  jQuery.map(dirtyWidgetsToSortedArray(dirtyWidgets), function(item){
      var i = item[0], 
        element = item[1], 
        widget = jQuery('#' + i);

        fun(element, widget);
  });
}

function onActionSuccess(json){
  // See if there are redirects
  var redirect = json['redirect'];
  if (redirect)
  {
    window.location.href = redirect;
    return;
  }

  execJsonCalls(json['before-load']);

  // Update dirty widgets
  var dirtyWidgets = json['widgets'];
  mapEachWidget(dirtyWidgets, function(element, widget){
      updateElement(widget, element);
  });

  execJsonCalls(json['on-load']);
  applySubmitClickEvent();
}

function execJsonCalls (calls) {
  if(calls) {
    var executedCalls = [];
    jQuery.each(calls, function(i, item){
      if(executedCalls.indexOf(item) == -1){
        jQuery(item).appendTo('body');
        executedCalls.push(item);
      }
    });
  }
}

function onActionFailure(response) {
  window.temp = window.open();
  try{
  window.temp.document.write(response.responseText);
    alert('Oops, we could not complete your request because of an internal error.');
  }catch(e){
    window.console && console.log(e, e.toString());
  }
}

function getActionUrl(actionCode, sessionString, isPure) {
    actionCode = unescape(actionCode);
    if (!sessionString) sessionString = "";
    var scriptName = location.protocol + "//"
                   + location.hostname
                   + (location.port ? ":" + location.port : "")
                   + location.pathname;
    var query = location.search;
    var url = scriptName + query + (query ? "&" : "?")
      + sessionString + (sessionString ? "&" : "") + "action=" + actionCode;

    if(isPure)
      url += '&pure=true';

    return url;
}

function initiateActionWithArgs(actionCode, sessionString, args, method, url) {
    if (!method) method = 'get';
    if (!url) url = getActionUrl(actionCode, sessionString);
    jQuery.ajax(url, {
        type: method,
        success: onActionSuccess,
        error: onActionFailure,
        data: args
    });
}

function initiateActionWithArgsAndCallback(actionCode, sessionString, args){
  var method = args.method || 'get';
  var complete = args.complete;
  var url = args.url || getActionUrl(actionCode, sessionString);
  delete args['method'];
  delete args['complete'];
  delete args['url'];
  args.action = actionCode;

  jQuery.ajax(args.url, {
      type: method,
      success: function(first, second, third){ 
        onActionSuccess(first, second, third);
        complete && complete();
      },
      error: onActionFailure,
      data: args
  });
}

/* convenience/compatibility function */
function initiateAction(actionCode, sessionString) {
    initiateActionWithArgs(actionCode, sessionString);
}

function initiateFormAction(actionCode, form, sessionString) {
    // Hidden "action" field should not be serialized on AJAX
    var serializedForm = form.serializeObjectWithSubmit();
    delete(serializedForm['action']);

    initiateActionWithArgs(actionCode, sessionString, serializedForm, form.attr('method'));
}

function disableIrrelevantButtons(currentButton) {
    $(currentButton).parents('form').find('submit').attr('disabled', true);
    $(currentButton).attr('disabled', false);
}

// Fix IE6 flickering issue
if(jQuery.browser.msie) {
    try {
	document.execCommand("BackgroundImageCache", false, true);
    } catch(err) {}
}

// Table hovering for IE (can't use CSS expressions because
// Event.observe isn't available there and we can't overwrite events
// using assignment
if(!window.XMLHttpRequest) {
    // IE6 only
    Event.observe(window, 'load', function() {
	    var tableRows = $$('.table table tbody tr');
	    tableRows.each(function(row) {
		    Event.observe(row, 'mouseover', function() {
			    row.addClassName('hover');
			});
		    Event.observe(row, 'mouseout', function() {
			    row.removeClassName('hover');
			});
		});
	});
}


function include_css(css_file) {
  libraryMissingWarning('include_css');

  getStylesNotCached([css_file]);
}

function include_dom(script_filename) {
  var html_doc = document.getElementsByTagName('head').item(0);
  var js = document.createElement('script');
  js.setAttribute('language', 'javascript');
  js.setAttribute('type', 'text/javascript');
  js.setAttribute('src', script_filename);
  html_doc.appendChild(js);
  return false;
}

/* working with CSS classes */
function addClass(el,myClass){
  if ((hasClass(el,myClass)) || (typeof el == 'undefined'))
    return;
  el.className += " " + myClass;
}

function removeClass(el,myClass){
  if (typeof el=='undefined')
    return;
  if (el.getAttribute('class') === null)
    return;

  var classes = el.getAttribute('class').split(" ");
  var result=[];

  for (i=classes.length;i>=0;i--) {
    if (classes[i] != myClass)
      result.push(classes[i]);
  }

  el.setAttribute('class', result.join(" ")); /* FIXME: ie6/7 need className here */
}

function hasClass(el, myClass){
  if ((el.className === null) || (typeof el == 'undefined'))
    return false;

  var classes = el.className.split(" ");

  for (i=classes.length;i>=0;i--) {
    if (classes[i] == myClass)
      return true;
  }

  return false;
}

/* collapsible sections */
function toggleExpandCollapse (heading,container) {
  if (hasClass(heading,"collapsed")) {
    removeClass(heading,"collapsed");
    removeClass(container,"collapsed");
    addClass(heading,"expanded");
    addClass(container,"expanded");
  } else {
    removeClass(heading,"expanded");
    removeClass(container,"expanded");
    addClass(heading,"collapsed");
    addClass(container,"collapsed");
  }
}

function updateWidgetStateFromHash() {
  libraryMissingWarning('updateWidgetStateFromHash');

  withScripts("/pub/scripts/jquery.ba-bbq.js", function(){
    $(window).bind('hashchange', function(event){
      var hash = window.location.hash;
      if (hash)
          initiateActionWithArgs(null, null, {'weblocks-internal-location-hash':hash}, "GET", "/");
    }).trigger('hashchange');
  });
}

function setLocationHash (hash) {
  window.location.hash = hash;
}

function libraryMissingWarning(feature){
  if(!window.withScripts){
    throw "Please use javascript library https://github.com/html/jquery-seq and put jquery-bbq into pub/scripts/ to use " + feature + " functionality";
    return;
  }
}

$ = function(id){
  if(typeof(id) == 'string'){
    return jQuery('#' + id);
  }else{
    return jQuery(id);
  }
};

jQuery(function(){
    applySubmitClickEvent();
});


window.Event.observe = function(obj, evtType, func){
  if(obj == window && evtType == 'load'){
    jQuery(func);
  }else{
    window.console && console.log("Don't know what to do for " + obj + " and event type " + evtType);
  }
};
