# Hxighlighter
Hxighlighter is a new standalone version of the JS code contained in the [HxAT project](https://github.com/lduarte1991/hxat). It provides a way to select regions and draw them for the purpose of annotating. As of 09/11/2019, it supports selecting text (HTML). The goal is to introduce other media types (image, video, audio) as the tool matures.

## Biggest Changes
1. Removed all code related to the Annotator project.
1. There is a custom-made library to handle ranges for selection and drawing, that implements backup protocols.
1. Created a more modular library to be used within the HxAT and allow for easier customization when dealing with UI and Storage.
1. Created an event system to ensure structure between components of the tool while allowing flexibility for those components that may stray from the norm.
1. Allow connection to exist directly between Hxighlighter and [CatchPy](https://github.com/nmaekawa/catchpy) as well as indirectly where HxAT is the intermediary server.
1. Restructure app to set the foundation for accepting multiple instances of the tool to exist in a single page.
1. Integrate the "Lite" mode mechanism into the project so changes to codebase will occur in both.
1. Better integration of accessible methods of making annotations.

## Usage
Not intended to have full functionality without also using the HxAT. It should be possible (and even encouraged) to use this as a "lite" mode of the functionality above.

To use the tool, make sure the HTML and JS are set up as [detailed below](#setup). If connected to a server that implements the [API specified in Catchpy](https://catchpy.harvardx.harvard.edu/static/anno/index.html), it should automatically connect and be ready to read/write/update/delete annotations using the Hxighlighter UI

## Setup
### Installing
`npm` is used to manage the packaging of the tool, though the final code is not actually distributed. Run `npm install` to set up the modules needed for the code to be packaged properly.

To customize what components and plugins are included with the final compilation of code, modify the `require` calls (removing or commenting out what is not needed) and finally running `npx webpack`.

The final compiled code should appear in the `dist` folder. Webpacking happens for **all** media types and their lite version counterparts. Each file is timestamped at the top for versioning purposes.

### Text 
A full example of the set-up is provided, and it consists of an HTML component and a JS component:

Html:
```html
<main class="hxihglighter-container">
    <section class="container1" aria-labelledby="to-title">
        <div class="annotations-section">
            
            <!-- Note: title and author will be annotatable. 
            Bring them out of the "annotations-section" area
            to stop this from happening. While author is not
            required, removing title will mean setting an
            explicit aria-label for the container-->
            
            <h3 id="to-title">Title of text</h3>
            <h4>Author</h4>
            
            <!-- Include content to be annotated inline here-->
        
        </div>
    </section>
</main>
```

JS:
```js
var hxighlighter_object = {
    "commonInfo":{
        "context_id": "id_for_broadest_grouping",
        "collection_id": "id_for_subgroup_collection_within_context",
        "object_id": "id_designating_object_being_annotated",
        "username": "Jane Smith",
        "user_id": "j_smith_12345"
    },
    "targets": [{
        'mediaType': "text",
        'method': 'inline', // options: ["inline", "url"]
        'object_source': '.container1', // options: selector or URL
        'viewerOptions': {
            "filterTabCount": 4,
            "defaultTab": "mine" // options ["mine", "peer", "instructor"
            "tabsAvailable": ["search", "mine", "instructor", "peer"], // exclude items from this list as needed
            "sidebarversion": "sidemenu",
            "pagination": 20 // options: any integer, how many annotations are loaded at a time
        },
        "storageOptions": {
            "external_url": {
                "catchpy": "https://example.com/url_to_api"
            },
            "token": "jwt token" // should be dynamically generated,
            "pagination": 20,
            "database_params": {} // custom params that vary on storage
        }
        
        // ...
        // Insert Plugin set up here
        // ...
    }]
}
```

## Demo

[Netlify Link](https://gracious-noether-988002.netlify.com/)

