const cropCatalog = {

  tomatoes: {
    name: "Tomatoes",
    type: "vegetable",

    growingPeriod: {
      minimumDays: 60,
      maximumDays: 90
    },

    commonPests: [
      "Aphids",
      "Whiteflies",
      "Tomato fruit worms"
    ],
    
    commonDiseases: [
      "Early blight",
      "Late blight",
      "Bacterial wilt"
    ]
  },

  maize: {
    name: "Maize",
    type: "cereal",

    growingPeriod: {
      minimumDays: 90,
      maximumDays: 120
    },

    commonPests: [
      "Fall armyworm",
      "Stem borers"
    ],

    commonDiseases: [
      "Maize streak disease",
      "Northern corn leaf blight"
    ]
  },

  "spring onion": {
    name: "Spring Onion",
    type: "vegetable",

    growingPeriod: {
      minimumDays: 60,
      maximumDays: 90
    },

    commonPests: [
      "Thrips",
      "Onion maggots"
    ],

    commonDiseases: [
      "Downy mildew",
      "Purple blotch"
    ]
  },

  carrots: {
    name: "Carrots",
    type: "root crop",

    growingPeriod: {
      minimumDays: 60,
      maximumDays: 80
    },

    commonPests: [
      "Aphids",
      "Carrot rust flies"
    ],

    commonDiseases: [
      "Root rot",
      "Leaf blight"
    ]
  },

  cabbage: {
    name: "Cabbage",
    type: "vegetable",

    growingPeriod: {
      minimumDays: 70,
      maximumDays: 100
    },

    commonPests: [
      "Cabbage worms",
      "Aphids",
      "Diamondback moth"
    ],

    commonDiseases: [
      "Black rot",
      "Downy mildew"
    ]
  },

  onions: {
    name: "Onions",
    type: "vegetable",

    growingPeriod: {
      minimumDays: 90,
      maximumDays: 150
    },

    commonPests: [
      "Thrips",
      "Onion maggots"
    ],

    commonDiseases: [
      "Downy mildew",
      "Purple blotch"
    ]
  },

  pepper: {
    name: "Pepper",
    type: "vegetable",

    growingPeriod: {
      minimumDays: 60,
      maximumDays: 90
    },

    commonPests: [
      "Aphids",
      "Whiteflies",
      "Thrips"
    ],

    commonDiseases: [
      "Bacterial leaf spot",
      "Anthracnose"
    ]
  },

  beans: {
    name: "Beans",
    type: "legume",

    growingPeriod: {
      minimumDays: 60,
      maximumDays: 90
    },

    commonPests: [
      "Bean beetles",
      "Aphids",
      "Bean flies"
    ],

    commonDiseases: [
      "Bean rust",
      "Anthracnose"
    ]
  }

};

module.exports = cropCatalog;