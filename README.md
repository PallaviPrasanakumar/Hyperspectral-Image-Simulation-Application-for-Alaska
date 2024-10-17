# Hyperspectral-Image-Simulation-Application-for-Alaska
__About the Application__   
True hyperspectral imagery, which captures a wide range of the electromagnetic spectrum with narrow spectral bands, is not as readily available as multispectral data. Satellites capable of capturing hyperspectral data are limited, making it challenging for researchers to access this valuable data regularly.

This application leverages Google Earth Engine to generate low-cost hyperspectral simulated Data from Sentinel-2 multispectral imagery, focusing on enhancing users ability to access hyperspectral data. Users can interactively select areas of interest within Alaska, adjust parameters such as cloud coverage, and choose specific image dates for detailed examination. The interface has tools for area of interest, sliders for filtering images based on cloud cover, and dropdowns for selecting dates. The application supports downloading and exporting of both Sentinel and Hyperspectral images and includes advanced functionalities like RGB and False Color Composite (FCC) visualizations download options. It’s designed to provide researchers, educators, and environmental scientists with a powerful tool for remote sensing and environmental monitoring, directly from their web browsers.

__The URL of the Application__ : https://pprasannakumar.users.earthengine.app/view/hysim  
This document contains the details of using the application:[Hysim documentation.pdf](https://github.com/user-attachments/files/17289974/Hysim.documentation.pdf)  
The repository contains two files Application.js and Acess to code.js .The files can only run in GEE code editor.
This document contains how to run these files once downlaoded.[Hysim_Application_Set_up_guide.docx](https://github.com/user-attachments/files/17422815/Hysim_Application_Set_up_guide.docx)

Link to code editor: https://code.earthengine.google.com/
To use GEE code editor from Google Earth Engine,one must have a account.Link to register : https://code.earthengine.google.com/register.

Alternatively ,You can directly download the folder Alaska_Hysim (which contains the above two files) on your local machine by running the following the command on your git bash.  
__git clone https://earthengine.googlesource.com/users/pprasannakumar/Alaska_Hysim__ 
To do this, navigate to the directory where you'd like to download the folder in Git Bash, and then run the command.  
For example, if you want to download it to your Desktop, you can move to the Desktop by using the command:  
~cd Desktop  
After you're in the desired location, simply run the clone command above to download the repository.
Once you have downloaded the files follow the same steps written in Google Earth Engine Application setup document.[Hysim_Application_Set_up_guide.docx](https://github.com/user-attachments/files/17422816/Hysim_Application_Set_up_guide.docx)
