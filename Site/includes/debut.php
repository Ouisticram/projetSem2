<!DOCTYPE html>
<html>
	<head>
        <meta content="text/html; charset=UTF-8">
		<link rel="stylesheet" href="css/index.css"/>
		<?php
        echo (!empty($titre))?'<title>'.$titre.'</title>':'<title> Node Wars Project </title>';
        ?>
        <script src="/socket.io/socket.io.js"> </script> 
		<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.3/css/bootstrap.min.css">
		<style>
	      body {
	      padding-top: 50px;
	      background-color:#333333;
	      }

	      #main{
	      width:100%;
	      }

	      td{width:50%;}
	      
	      #actionGroup{
	      text-align:right;
	      }

	      .container{
	      margin:0px;
	      padding:0px;
	      width:100%;
	      }

	      #mainFrame{margin-top:4px;}

	      #editor{
	      width:101%;
	      height:480px;
	      display:block;
	      box-sizing: border-box;}
	    </style>
	 </head>
	<body>
	<header>
		<!--<a href="index.php"><img alt="Bannière" src="images/banniere.png" /></a>-->
		<div><p>Bannière à faire</p></div>
	</header>
	
	<div id="page">
		<nav>
		<ul>
			<li>
				<a href="index.php">Accueil</a>
			</li>
			<li>
				<a href="information.php">Informations sur le projet ?</a>
			</li>
			<li>
				<a href="jeu.php">Jouer à Node Wars</a>
			</li>
			<li>
				<a href="contact.php">Contact</a>
			</li>
		</ul>
		</nav>

