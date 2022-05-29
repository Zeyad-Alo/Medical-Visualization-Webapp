import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';
import { vec3, quat, mat4 } from 'gl-matrix';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';

import vtkImageCroppingWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget';
import vtkImageCropFilter from '@kitware/vtk.js/Filters/General/ImageCropFilter';
import vtkPiecewiseGaussianWidget from '@kitware/vtk.js/Interaction/Widgets/PiecewiseGaussianWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';


import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import { c } from '@kitware/vtk.js/Common/Core/Math/index';





// GLOBAL RENDERING
const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
  });
  const renderWindow = fullScreenRenderWindow.getRenderWindow();
  const renderer = fullScreenRenderWindow.getRenderer();
  const apiRenderWindow = fullScreenRenderWindow.getApiSpecificRenderWindow();
  //-----------------------------------------------------------------------------------


function renderHead(){


const select = document.querySelector('select');
select.addEventListener('change', setExample);
function setExample() {
    const choice = select.value;
  
    if (choice === "0") {
      renderHead();
    } else if (choice === "1") {
      renderChest();
    }


}



  
    const actor = vtkActor.newInstance();
    const mapper = vtkMapper.newInstance();
    const marchingCube = vtkImageMarchingCubes.newInstance({
      contourValue: 0.0,
      computeNormals: true,
      mergePoints: true,
    });
    
    actor.setMapper(mapper);
    mapper.setInputConnection(marchingCube.getOutputPort());
    
    function updateIsoValue(e) {
      const isoValue = Number(e.target.value);
      marchingCube.setContourValue(isoValue);
      renderWindow.render();
    }
    
    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    marchingCube.setInputConnection(reader.getOutputPort());
    
    reader
      .setUrl(`https://kitware.github.io/vtk-js/data/volume/headsq.vti`, { loadData: true })
      .then(() => {
        const data = reader.getOutputData();
        const dataRange = data.getPointData().getScalars().getRange();
        const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;
    
        const el = document.querySelector('.isoValue');
        el.setAttribute('min', dataRange[0]);
        el.setAttribute('max', dataRange[1]);
        el.setAttribute('value', firstIsoValue);
        el.addEventListener('input', updateIsoValue);
    
        marchingCube.setContourValue(firstIsoValue);
        renderer.addActor(actor);
        renderer.getActiveCamera().set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
        renderer.resetCamera();
        renderWindow.render();
      });
    

}









  //---------------------------------------------------------------------------



function renderChest(){

  const rootContainer = document.querySelector(
    '.vtk-js-example-piecewise-gaussian-widget'
  );
  const containerStyle = rootContainer ? { height: '100%' } : null;

  fullScreenRenderWindow.set({rootContainer,
    containerStyle});
    
  renderWindow.getInteractor().setDesiredUpdateRate(15.0);


  //   // Create Widget container
  // const widgetContainer = document.createElement('div');
  // widgetContainer.setAttribute("id", "widgetContainer");
  // widgetContainer.style.position = 'absolute';
  // widgetContainer.style.top = 'calc(10px + 75%)';
  // widgetContainer.style.left = '5px';
  // widgetContainer.style.background = 'rgba(255, 255, 255, 0.3)';
  // body.appendChild(widgetContainer);

  // // Create Label for preset
  // const labelContainer = document.createElement('div');
  // labelContainer.setAttribute("id", "labelContainer");
  // labelContainer.style.position = 'absolute';
  // labelContainer.style.top = '5px';
  // labelContainer.style.left = '5px';
  // labelContainer.style.width = '100%';
  // labelContainer.style.color = 'white';
  // labelContainer.style.textAlign = 'center';
  // labelContainer.style.userSelect = 'none';
  // labelContainer.style.cursor = 'pointer';
  // body.appendChild(labelContainer);

  let presetIndex = 1;
  const globalDataRange = [0, 255];
  const lookupTable = vtkColorTransferFunction.newInstance();

  function changePreset(delta = 1) {
    presetIndex =
      (presetIndex + delta + vtkColorMaps.rgbPresetNames.length) %
      vtkColorMaps.rgbPresetNames.length;
    lookupTable.applyColorMap(
      vtkColorMaps.getPresetByName(vtkColorMaps.rgbPresetNames[presetIndex])
    );
    lookupTable.setMappingRange(...globalDataRange);
    lookupTable.updateRange();
    labelContainer.innerHTML = vtkColorMaps.rgbPresetNames[presetIndex];
  }

  let intervalID = null;
  function stopInterval() {
    if (intervalID !== null) {
      clearInterval(intervalID);
      intervalID = null;
    }
  }

  labelContainer.addEventListener('click', (event) => {
    if (event.pageX < 200) {
      stopInterval();
      changePreset(-1);
    } else {
      stopInterval();
      changePreset(1);
    }
  });


  fullScreenRenderWindow.setResizeCallback(({ width, height }) => {
    widgetPW.setSize(Math.min(450, width - 10), 150);
  });

  const piecewiseFunction = vtkPiecewiseFunction.newInstance();


  // ----------------------------------------------------------------------------
// 2D overlay rendering
// ----------------------------------------------------------------------------

const overlaySize = 15;
const overlayBorder = 2;
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.width = `${overlaySize}px`;
overlay.style.height = `${overlaySize}px`;
overlay.style.border = `solid ${overlayBorder}px red`;
overlay.style.borderRadius = '50%';
overlay.style.left = '-100px';
overlay.style.pointerEvents = 'none';
body.appendChild(overlay);

// ----------------------------------------------------------------------------
// Widget manager
// ----------------------------------------------------------------------------

const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);

const widget = vtkImageCroppingWidget.newInstance();

function widgetRegistration(e) {
  const action = e ? e.currentTarget.dataset.action : 'addWidget';
  const viewWidget = widgetManager[action](widget);
  if (viewWidget) {
    viewWidget.setDisplayCallback((coords) => {
      overlay.style.left = '-100px';
      if (coords) {
        const [w, h] = apiRenderWindow.getSize();
        overlay.style.left = `${Math.round(
          (coords[0][0] / w) * window.innerWidth -
            overlaySize * 0.5 -
            overlayBorder
        )}px`;
        overlay.style.top = `${Math.round(
          ((h - coords[0][1]) / h) * window.innerHeight -
            overlaySize * 0.5 -
            overlayBorder
        )}px`;
      }
    });

    renderer.resetCamera();
    renderer.resetCameraClippingRange();
  }
  widgetManager.enablePicking();
  renderWindow.render();
}

// Initial widget register
widgetRegistration();

// ----------------------------------------------------------------------------
// Volume rendering
// ----------------------------------------------------------------------------


const readerVolume = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

const actorVolume = vtkVolume.newInstance();
const mapperVolume = vtkVolumeMapper.newInstance();
mapperVolume.setSampleDistance(1.1);
actorVolume.setMapper(mapperVolume);

// create color and opacity transfer functions
const ctfun = vtkColorTransferFunction.newInstance();
ctfun.addRGBPoint(0, 85 / 255.0, 0, 0);
ctfun.addRGBPoint(95, 1.0, 1.0, 1.0);
ctfun.addRGBPoint(225, 0.66, 0.66, 0.5);
ctfun.addRGBPoint(255, 0.3, 1.0, 0.5);
const ofun = vtkPiecewiseFunction.newInstance();
ofun.addPoint(0.0, 0.0);
ofun.addPoint(255.0, 1.0);
actorVolume.getProperty().setRGBTransferFunction(0, ctfun);
actorVolume.getProperty().setScalarOpacity(0, ofun);
actorVolume.getProperty().setScalarOpacityUnitDistance(0, 3.0);
actorVolume.getProperty().setInterpolationTypeToLinear();
actorVolume.getProperty().setUseGradientOpacity(0, true);
actorVolume.getProperty().setGradientOpacityMinimumValue(0, 2);
actorVolume.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
actorVolume.getProperty().setGradientOpacityMaximumValue(0, 20);
actorVolume.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
actorVolume.getProperty().setShade(true);
actorVolume.getProperty().setAmbient(0.2);
actorVolume.getProperty().setDiffuse(0.7);
actorVolume.getProperty().setSpecular(0.3);
actorVolume.getProperty().setSpecularPower(8.0);

mapperVolume.setInputConnection(readerVolume.getOutputPort());

// -----------------------------------------------------------
// Get data
// -----------------------------------------------------------

function getCroppingPlanes(imageData, ijkPlanes) {
  const rotation = quat.create();
  mat4.getRotation(rotation, imageData.getIndexToWorld());

  const rotateVec = (vec) => {
    const out = [0, 0, 0];
    vec3.transformQuat(out, vec, rotation);
    return out;
  };

  const [iMin, iMax, jMin, jMax, kMin, kMax] = ijkPlanes;
  const origin = imageData.indexToWorld([iMin, jMin, kMin]);
  // opposite corner from origin
  const corner = imageData.indexToWorld([iMax, jMax, kMax]);
  return [
    // X min/max
    vtkPlane.newInstance({ normal: rotateVec([1, 0, 0]), origin }),
    vtkPlane.newInstance({ normal: rotateVec([-1, 0, 0]), origin: corner }),
    // Y min/max
    vtkPlane.newInstance({ normal: rotateVec([0, 1, 0]), origin }),
    vtkPlane.newInstance({ normal: rotateVec([0, -1, 0]), origin: corner }),
    // X min/max
    vtkPlane.newInstance({ normal: rotateVec([0, 0, 1]), origin }),
    vtkPlane.newInstance({ normal: rotateVec([0, 0, -1]), origin: corner }),
  ];
}

readerVolume.setUrl(`https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`).then(() => {
  readerVolume.loadData().then(() => {
    const image = readerVolume.getOutputData();
    const dataArray = image.getPointData().getScalars();
    const dataRange = dataArray.getRange();
    globalDataRange[0] = dataRange[0];
    globalDataRange[1] = dataRange[1];
    
    // Update Lookup table
    changePreset();
    widgetPW.setDataArray(dataArray.getData());
    widgetPW.applyOpacity(piecewiseFunction);

    // update crop widget
    widget.copyImageDataDescription(image);
    const cropState = widget.getWidgetState().getCroppingPlanes();
    cropState.onModified(() => {
      const planes = getCroppingPlanes(image, cropState.getPlanes());
      mapperVolume.removeAllClippingPlanes();
      planes.forEach((plane) => {
        mapperVolume.addClippingPlane(plane);
      });
      mapperVolume.modified();
    });


    widgetPW.setColorTransferFunction(lookupTable);
    lookupTable.onModified(() => {
      widgetPW.render();
      renderWindow.render();
    });


    // add volume to renderer
    renderer.addVolume(actorVolume);
    renderer.resetCamera();
    renderer.resetCameraClippingRange();
    renderWindow.render();
  });
});



// ----------------------------------------------------------------------------
// Default setting Piecewise function widget
// ----------------------------------------------------------------------------

widgetPW.addGaussian(0.425, 0.5, 0.2, 0.3, 0.2);
widgetPW.addGaussian(0.75, 1, 0.3, 0, 0);

widgetPW.setContainer(widgetContainer);
widgetPW.bindMouseListeners();

widgetPW.onAnimation((start) => {
  if (start) {
    renderWindow.getInteractor().requestAnimation(widgetPW);
  } else {
    renderWindow.getInteractor().cancelAnimation(widgetPW);
  }
});

widgetPW.onOpacityChange(() => {
  widgetPW.applyOpacity(piecewiseFunction);
  if (!renderWindow.getInteractor().isAnimating()) {
    renderWindow.render();
  }
});

actorVolume.getProperty().setRGBTransferFunction(0, lookupTable);
actorVolume.getProperty().setScalarOpacity(0, piecewiseFunction);
actorVolume.getProperty().setInterpolationTypeToFastLinear();


// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------


function updateFlag(e) {
  const value = !!e.target.checked;
  const name = e.currentTarget.dataset.name;
  widget.set({ [name]: value }); // can be called on either viewWidget or parentWidget

  widgetManager.enablePicking();
  renderWindow.render();
}

const elems = document.querySelectorAll('.flag');
for (let i = 0; i < elems.length; i++) {
  elems[i].addEventListener('change', updateFlag);
}

const buttons = document.querySelectorAll('button');
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('click', widgetRegistration);
}
}

const controlPanelMain = `
<table id="panel">
  <tr>
    <td>
      <select class="representations" style="width: 100%">
        <option value="">--Make a choice--</option>
        <option value="0">Head</option>
        <option value="1">Chest</option>
      </select>
    </td>
  </tr>
  <tr>
    <td>
      <input class="isoValue" type="range" min="4" max="80" value="6" />
    </td>
  </tr>
  <tr>
    <tbody id="crop">
          <tr>
             <td>pickable</td>
             <td> <input class="flag" data-name="pickable" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>visibility</td>
             <td> <input class="flag" data-name="visibility" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>contextVisibility</td>
             <td> <input class="flag" data-name="contextVisibility" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>handleVisibility</td>
             <td> <input class="flag" data-name="handleVisibility" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>faceHandlesEnabled</td>
             <td> <input class="flag" data-name="faceHandlesEnabled" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>edgeHandlesEnabled</td>
             <td> <input class="flag" data-name="edgeHandlesEnabled" type="checkbox" checked="checked"> </td>
          </tr>
          <tr>
             <td>cornerHandlesEnabled</td>
             <td> <input class="flag" data-name="cornerHandlesEnabled" type="checkbox" checked="checked"> </td>
          </tr>
       </tbody>
    </tr>
</table>
`;


fullScreenRenderWindow.addController(controlPanelMain);

// const adjustableTransferFunctionWidget = vtkPiecewiseGaussianWidget.newInstance({
//     numberOfBins: 256,
//     size: [400, 150],
// });
// adjustableTransferFunctionWidget.updateStyle({
//     backgroundColor: 'rgba(255, 255, 255, 0.6)',
//     histogramColor: 'rgba(100, 100, 100, 0.5)',
//     strokeColor: 'rgb(0, 0, 0)',
//     activeColor: 'rgb(255, 255, 255)',
//     handleColor: 'rgb(50, 150, 50)',
//     buttonDisableFillColor: 'rgba(255, 255, 255, 0.5)',
//     buttonDisableStrokeColor: 'rgba(0, 0, 0, 0.5)',
//     buttonStrokeColor: 'rgba(0, 0, 0, 1)',
//     buttonFillColor: 'rgba(255, 255, 255, 1)',
//     strokeWidth: 2,
//     activeStrokeWidth: 3,
//     buttonStrokeWidth: 1.5,
//     handleWidth: 3,
//     iconSize: 20, // Can be 0 if you want to remove buttons (dblClick for (+) / rightClick for (-))
// });

// // ----------------------------------------------------------------------------
// // Default setting Piecewise function widget
// // ----------------------------------------------------------------------------

// adjustableTransferFunctionWidget.addGaussian(0.425, 0.5, 0.2, 0.3, 0.2);
// adjustableTransferFunctionWidget.addGaussian(0.75, 1, 0.3, 0, 0);

// const transferFunctionContainer = document.querySelector('#ray-transfer-function');
// adjustableTransferFunctionWidget.setContainer(transferFunctionContainer);
// adjustableTransferFunctionWidget.bindMouseListeners();
// adjustableTransferFunctionWidget.setSize(200, 100);

// adjustableTransferFunctionWidget.onAnimation((start) => {
//     if (start) {
//         renderWindow.getInteractor().requestAnimation(adjustableTransferFunctionWidget);
//     } else {
//         renderWindow.getInteractor().cancelAnimation(adjustableTransferFunctionWidget);
//     }
// });

// adjustableTransferFunctionWidget.onOpacityChange(() => {
//     adjustableTransferFunctionWidget.applyOpacity(piecewiseFun);
//     if (!renderWindow.getInteractor().isAnimating()) {
//         renderWindow.render();
//     }
// });
//-----------------------------------------------------------------------------------------

const widgetPW = vtkPiecewiseGaussianWidget.newInstance({
  numberOfBins: 256,
  size: [400, 150],
});
widgetPW.updateStyle({
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  histogramColor: 'rgba(100, 100, 100, 0.5)',
  strokeColor: 'rgb(0, 0, 0)',
  activeColor: 'rgb(255, 255, 255)',
  handleColor: 'rgb(50, 150, 50)',
  buttonDisableFillColor: 'rgba(255, 255, 255, 0.5)',
  buttonDisableStrokeColor: 'rgba(0, 0, 0, 0.5)',
  buttonStrokeColor: 'rgba(0, 0, 0, 1)',
  buttonFillColor: 'rgba(255, 255, 255, 1)',
  strokeWidth: 2,
  activeStrokeWidth: 3,
  buttonStrokeWidth: 1.5,
  handleWidth: 3,
  iconSize: 20, // Can be 0 if you want to remove buttons (dblClick for (+) / rightClick for (-))
  padding: 10,
});

const body = document.querySelector('body');
 // Create Widget container
 const widgetContainer = document.createElement('div');
 widgetContainer.setAttribute("id", "widgetContainer");
 widgetContainer.style.position = 'absolute';
 widgetContainer.style.top = 'calc(10px + 40%)';
 widgetContainer.style.left = '5px';
 widgetContainer.style.background = 'rgba(255, 255, 255, 0.3)';
 body.appendChild(widgetContainer);

 // Create Label for preset
 const labelContainer = document.createElement('div');
 labelContainer.setAttribute("id", "labelContainer");
 labelContainer.style.position = 'absolute';
 labelContainer.style.top = '5px';
 labelContainer.style.left = '5px';
 labelContainer.style.width = '100%';
 labelContainer.style.color = 'white';
 labelContainer.style.textAlign = 'center';
 labelContainer.style.userSelect = 'none';
 labelContainer.style.cursor = 'pointer';
 body.appendChild(labelContainer);


const cont = fullScreenRenderWindow.getControlContainer();
cont.style.backgroundColor = 'black'
cont.style.color = 'white'

const isoSlider = document.querySelector('input');
const crop = document.getElementById('crop');
isoSlider.style.visibility = 'hidden';
crop.style.visibility = 'hidden';  

const select = document.querySelector('select');
select.addEventListener('change', setExample);
function setExample() {
    const choice = select.value;
    const panel = document.getElementById('panel');
    const labelContainer = document.getElementById('labelContainer');
    const widgetContainer = document.getElementById('widgetContainer');

    if (choice === "0") {
      renderer.removeAllViewProps();
      isoSlider.style.visibility = 'visible';
      crop.style.visibility = 'hidden';
      widgetContainer.style.visibility = 'hidden';
      labelContainer.style.visibility = 'hidden';
      renderHead();
      } else if (choice === "1") {
        renderer.removeAllViewProps();
        renderChest();
        isoSlider.style.visibility = 'hidden';
        crop.style.visibility = 'visible';
        widgetContainer.style.visibility = 'visible';
        labelContainer.style.visibility = 'visible';
    } else if (choice === "") {
      isoSlider.style.visibility = 'hidden';
      crop.style.visibility = 'hidden';
      widgetContainer.style.visibility = 'hidden';
      labelContainer.style.visibility = 'hidden';
      renderer.removeAllViewProps();
    }


}
