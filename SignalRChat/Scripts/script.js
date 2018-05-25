$(function() {
  setScreen(JSON.parse(sessionStorage.getItem('name')));

  // Declare a proxy to reference the hub.
  var chatHub = $.connection.chatHub;

  registerClientMethods(chatHub);

  // Start Hub
  $.connection.hub.start().done(function() {
    registerEvents(chatHub);
  });

  if (localStorage.getItem('coors')) {
    $('.draggableChat').css(
      'left',
      JSON.parse(localStorage.getItem('coors'))[0]
    );
    $('.draggableChat').css(
      'top',
      JSON.parse(localStorage.getItem('coors'))[1]
    );
  } else {
    $('.draggableChat').css('left', '835px');
    $('.draggableChat').css('top', '0');
  }

  $('.draggableChat').draggable({
    stop: function() {
      var coors = [];
      coors.push($('.draggableChat')[0].style.left);
      coors.push($('.draggableChat')[0].style.top);
      localStorage.setItem('coors', JSON.stringify(coors));
    }
  });
});

function setScreen(isLogin) {
  if (!isLogin) {
    $('#divChat').hide();
    $('#divLogin').show();
  } else {
    $('#divChat').show();
    $('#divLogin').hide();
  }
}

function registerEvents(chatHub) {
  if (sessionStorage.getItem('name')) {
    var name = JSON.parse(sessionStorage.getItem('name'));
    chatHub.server.connect(name);
  }

  $('#btnStartChat').click(function() {
    sessionStorage.setItem('name', JSON.stringify($('#txtNickName').val()));
    var name = '';

    if ($('#txtNickName').val()) {
      name = $('#txtNickName').val();
    } else {
      name = JSON.parse(sessionStorage.getItem('name'));
    }

    if (name.length > 0) {
      chatHub.server.connect(name);
    } else {
      alert('Введите своё имя.');
    }
  });

  $('.expand').click(function() {
    var messageBar = $('.messageBar');
    var chatWindow = $('.chatWindow');
    var state = messageBar[0].style.display;

    function expd() {
      if (state == 'none') {
        messageBar[0].style.display = 'block';
        chatWindow[0].style.display = 'block';
        $('.expand')[0].textContent = '🡆';
      } else {
        messageBar[0].style.display = 'none';
        chatWindow[0].style.display = 'none';
        $('.expand')[0].textContent = '🡄';
      }
    }

    expd();
  });

  $('#btnSendMsg').click(function() {
    var msg = $('#txtMessage').val();
    if (msg.length > 0) {
      var userName = $('#hdUserName').val();
      chatHub.server.sendMessageToAll(userName, msg);
      $('#txtMessage').val('');
    }
  });

  $('#txtNickName').keypress(function(e) {
    if (e.which == 13) {
      $('#btnStartChat').click();
    }
  });

  $('#txtMessage').keypress(function(e) {
    if (e.which == 13) {
      $('#btnSendMsg').click();
    }
  });
}

function registerClientMethods(chatHub) {
  // Calls when user successfully logged in
  chatHub.client.onConnected = function(id, userName, allUsers, messages) {
    setScreen(JSON.parse(sessionStorage.getItem('name')));

    $('#hdId').val(id);
    $('#hdUserName').val(userName);
    $('#spanUser').html(userName);

    // Add All Users
    for (i = 0; i < allUsers.length; i++) {
      AddUser(chatHub, allUsers[i].ConnectionId, allUsers[i].UserName);
    }

    // Add Existing Messages
    for (i = 0; i < messages.length; i++) {
      AddMessage(messages[i].UserName, messages[i].Message);
    }
  };

  // On New User Connected
  chatHub.client.onNewUserConnected = function(id, name) {
    AddUser(chatHub, id, name);

    var disc = $('<div class="connect">' + name + ' зашёл в чат</div>');

    $(disc).hide();
    $('#divusers').prepend(disc);
    $(disc)
      .fadeIn(200)
      .delay(2000)
      .fadeOut(200);
  };

  // On User Disconnected
  chatHub.client.onUserDisconnected = function(id, userName) {
    //$('#' + id).remove();
    $('#' + id)[0].children[0].style.backgroundColor = 'red';
    var ctrId = 'private_' + id;
    $('#' + ctrId).remove();

    var disc = $(
      '<div class="disconnect">' + userName + ' вышел из чата</div>'
    );

    $(disc).hide();
    $('#divusers').prepend(disc);
    $(disc)
      .fadeIn(200)
      .delay(2000)
      .fadeOut(200);
  };

  chatHub.client.messageReceived = function(userName, message) {
    AddMessage(userName, message);
  };

  chatHub.client.sendPrivateMessage = function(
    windowId,
    fromUserName,
    message
  ) {
    var ctrId = 'private_' + windowId;

    if ($('#' + ctrId).length == 0) {
      createPrivateChatWindow(chatHub, windowId, ctrId, fromUserName);
    }

    $('#' + ctrId)
      .find('#divMessage')
      .append(
        '<div class="message"><span class="userName">' +
          fromUserName +
          '</span>: ' +
          message +
          '</div>'
      );

    // set scrollbar
    var height = $('#' + ctrId).find('#divMessage')[0].scrollHeight;
    $('#' + ctrId)
      .find('#divMessage')
      .scrollTop(height);
  };
}

function AddUser(chatHub, id, name) {
  var userId = $('#hdId').val();
  var code = '';
  var users = $('.user');

  [].forEach.call(users, function(element) {
    if (element.textContent == name) {
      element.remove();
    }
  });

  if (userId == id) {
    code = $(
      '<div class="loginUser"><div class="stateMe"></div>' + name + '</div>'
    );
  } else {
    code = $(
      '<a id="' +
        id +
        '" class="user" ><div class="stateOther"></div>' +
        name +
        '</a>'
    );

    $(code).dblclick(function() {
      var id = $(this).attr('id');

      if (userId != id) OpenPrivateChatWindow(chatHub, id, name);
    });
  }

  $('#divusers').append(code);
}

function AddMessage(userName, message) {
  $('#divChatWindow').append(
    '<div class="message"><span class="userName">' +
      userName +
      '</span>: ' +
      message +
      '</div>'
  );

  var height = $('#divChatWindow')[0].scrollHeight;
  $('#divChatWindow').scrollTop(height);
}

function OpenPrivateChatWindow(chatHub, id, userName) {
  var ctrId = 'private_' + id;

  if ($('#' + ctrId).length > 0) return;

  createPrivateChatWindow(chatHub, id, ctrId, userName);
}

function createPrivateChatWindow(chatHub, userId, ctrId, userName) {
  var div =
    '<div id="' +
    ctrId +
    '" class="ui-widget-content draggable" rel="0">' +
    '<div class="header">' +
    '<div  style="float:right;">' +
    '<img id="imgDelete"  style="cursor:pointer;" src="/Images/close.png"/>' +
    '</div>' +
    '<span class="selText" rel="0">' +
    userName +
    '</span>' +
    '</div>' +
    '<div id="divMessage" class="messageArea">' +
    '</div>' +
    '<div class="buttonBar">' +
    '<input id="txtPrivateMessage" class="msgText" type="text"   />' +
    '<input id="btnSendMessage" class="submitButton button" type="button" value="Отправить"   />' +
    '</div>' +
    '</div>';

  var $div = $(div);

  // DELETE BUTTON IMAGE
  $div.find('#imgDelete').click(function() {
    $('#' + ctrId).remove();
  });

  // Send Button event
  $div.find('#btnSendMessage').click(function() {
    $textBox = $div.find('#txtPrivateMessage');
    var msg = $textBox.val();
    if (msg.length > 0) {
      chatHub.server.sendPrivateMessage(userId, msg);
      $textBox.val('');
    }
  });

  // Text Box event
  $div.find('#txtPrivateMessage').keypress(function(e) {
    if (e.which == 13) {
      $div.find('#btnSendMessage').click();
    }
  });

  AddDivToContainer($div);
}

function AddDivToContainer($div) {
  $('#divContainer').prepend($div);

  $div.draggable({
    handle: '.header',
    stop: function() {}
  });

  ////$div.resizable({
  ////    stop: function () {

  ////    }
  ////});
}
