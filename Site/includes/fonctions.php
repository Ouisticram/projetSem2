<?php	
	function redirection($page)
	{
		if(isset($page))
		{
			header('Location:'.$page);
		}
		else
		{
			echo 'erreur lors de la redirection vers '.$page;
		}
	}
?>