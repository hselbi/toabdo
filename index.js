const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const csvParser = require('csv-parser');


var count = '0';
var letter = 'B';


async function getData() {
    try {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let letter of alphabet) {
            const csvFilePath = path.join(__dirname, `${letter}.csv`);
            const data = await readCSVFile(csvFilePath);
            if (data) {
                console.log(`Processing data from ${letter}.csv`);
                const artistsData = await processCSVData(data);
                // const jsonString = JSON.stringify(artistsData, null, 4);  // Adding indentation for better readability
                // const outputFilePath = `prices/data_${letter}.json`;
                // fs.writeFileSync(outputFilePath, jsonString);
                // console.log(`Data for ${letter} written to ${outputFilePath}`);
            }
        }
    } catch (error) {
        console.error('Error processing CSV files:', error);
    }
}
async function readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                resolve(data);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}


async function processCSVData(data) {
	// try {
		// let filePath = "pages.json";
		// const jsonData = fs.readFileSync(filePath, 'utf8');
		// const data = JSON.parse(jsonData);
		var product_page = [];
		var len = data.length;
		for (let i = 564; i < len; i++) {
			console.log(`${i} of ${len}`);
			var page = {
				id: "",
				link: "",
				title: "",
				image: "",
				artist: "",
				options: {
					"keys": [],
					"values": []
				},
				sizes : {}
			}
			const item = data[i];
			page.title = item.Title;
			page.artist = item.Artist;
			page.link = item.Link;

			// const jsonFileName = `${page.artist}.json`;
			const response = await axios.get(page.link);
			const html = response.data;
			const $ = cheerio.load(html);
			page.id = $("#box-10552 > div > span").text();
			console.log(page.id);
			page.image = "https://www.oilpaintings.com" + $(".main-image").attr("src");

			const labels = $(".radio-attributes-content > label");
			labels.each((index, element) => {
				const key = $(element).find("span").text()
				const value = $(element).find("input").val();
				page.options.keys.push(key);
				page.options.values.push(value);

			});
			page.sizes = await getFrames(page);
			// console.log(page);
			addPaintingToArtistData(page, product_page);
		}
		return product_page;

}


async function getFrames(product_page) {

	const header = {
		"X-Requested-With": "XMLHttpRequest",
		"Accept": "application/json, text/javascript, */*; q=0.01",
		"Cookie": "tlSID=eptbe7h0b2ig3jt99ltpa873g4; was_visit=ed83623d96a51fb1bc746e277dcc5d5630bb1ad4919f3f18946b31ef96e2182aa%3A2%3A%7Bi%3A0%3Bs%3A9%3A%22was_visit%22%3Bi%3A1%3Bs%3A1%3A%221%22%3B%7D; _csrf=8745975a3592f961573c56cf9f404492869196e0b9ef2deaa94d4f8b272b15eba%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22nHAFVprTW0i-5Z1bqp8HFsHWo8NAow6s%22%3B%7D; SL_G_WPT_TO=ar; fp_visitor_uuid=dac3a042b77e411228b268626db3e340; _gcl_au=1.1.1824944838.1689801237; SL_GWPT_Show_Hide_tmp=1; SL_wptGlobTipTmp=1; _gid=GA1.2.1296073904.1689801237; subscriber_popup=true; popup_10781=true; viewed_products[112900]=112900; viewed_products[71066]=71066; corner=true; _ga=GA1.1.1873455866.1689801237; _ga_8VKCL64849=GS1.1.1689801237.1.1.1689803133.0.0.0; _uetsid=2c6de110267911eebcd535b91bffe67a; _uetvid=2c6defa0267911ee8ccfe5d53ea8a1e4",
		"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
	};
	const fetchSize = async (value) => {
		const sizes = {};
		const params = {
			"_csrf": "wHVJnA1Lya69eSbCdvcwXY4MNJ09RCQE08A8NgXveIyuPQjaWzu7-upJT-9DrQE__3wM1Xs3bFO8-HJ3aphO_w==",
			"products_id": product_page.id,
			"id[5]": value,
			"elements[1]": 0,
		};
	
		let size = {
			price: "",
			frames: []
		};
	
		try {
			const response = await axios.get("https://www.oilpaintings.com/catalog/product-configurator", {
				headers: header,
				params: params
			});
			console.log(product_page.id + ' ==> ' + value);
			const json = response.data;
			
			size.price = json.configurator_price ? json.configurator_price : "";
			const frames = json.configurator_elements[1].products_array;
			frames.forEach((frame) => {
				size.frames.push({
					name: frame.name ? frame.name : "",
					price: frame.price ? frame.price : "",
					image: "https://www.oilpaintings.com" + frame.image,
				});
			});
		} catch (error) {
			console.error('Error fetching product options:', error.message);
		}
	
		sizes[value] = size;
	
		return sizes;
	};
	return await Promise.all(product_page.options.values.map(fetchSize));

}

function addPaintingToArtistData(painting, artistsData) {
    const artistIndex = artistsData.findIndex((artistData) => artistData.Artist === painting.artist);
    if (artistIndex !== -1) {
        artistsData[artistIndex].Paintings.push(painting);
    } else {
        const artistData = {
            Artist: painting.artist,
            Paintings: [painting]
        };
        artistsData.push(artistData);
    }

	const jsonFileName = `prices/data_${letter}.json`;
    const jsonString = JSON.stringify(artistsData, null, 4); // Adding indentation for better readability

    try {
        fs.writeFileSync(jsonFileName, jsonString);
        console.log(`Successfully updated file ${jsonFileName}`);
    } catch (err) {
        console.log('Error writing file', err);
    }
}


function appendToFile(filename, data) {
    return new Promise((resolve, reject) => {
        fs.appendFile(filename, data, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
getData();
