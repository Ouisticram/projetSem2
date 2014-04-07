<?php
$titre = " Node Wars Project : Le jeu";
include("includes/debut.php");
?>
    <div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="#">Node Wars</a>
        </div>
        <div class="collapse navbar-collapse">
          <ul class="nav navbar-nav">
            <li class="active"><a href="#">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="container">
      
      <div class="game">
	<table id="main">
	  <tr>
	    <td>
	      <canvas id="mainFrame" width="640" height="480"> </canvas>
	    </td>
	    <td>
	      <div id="editor"></div>
	    </td>
	    <td>
	  </tr>
	  <tr>
	    <td>
	    </td>               
	    <td id="actionGroup">
	      <div class="btn-group"> 
		<button class="btn" onClick="commit()">Commit</button>
	      </div>
	    </td>
	  </tr>
	</table>
      </div>

    </div><!-- /.container -->


    <script src="./event.js"> </script>
    
    <script src="http://ace.c9.io/build/src-min/ace.js"
	    type="text/javascript" charset="utf-8"></script>

    <script>
      var editor = ace.edit("editor");
      editor.setTheme("ace/theme/monokai");
      editor.getSession().setMode("ace/mode/javascript");
    </script>
    
    <p id="debug"> </p>
    <script src="https://code.jquery.com/jquery-1.10.2.min.js"></script>
    <script
       src="//netdna.bootstrapcdn.com/bootstrap/3.0.3/js/bootstrap.min.js">
    </script>
<?php
include("includes/fin.php");
?>