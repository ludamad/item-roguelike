module Tests {
	"use strict";

	export class ConsoleTests extends tsUnit.TestClass {

		hexColorMultiply() {
			let col: Core.Color = "#FFFFFF";
			let col2: Core.Color = Core.ColorUtils.multiply(col, 0.5);
			let col3: Core.Color = Core.ColorUtils.multiply(col, 0.1);

			this.areIdentical( col2, 0x808080, "col2" );
			this.areIdentical( col3, 0x1A1A1A, "col3" );
		}

		shortHexColorMultiply() {
			let col: Core.Color = "#FFF";
			let col2: Core.Color = Core.ColorUtils.multiply(col, 0.5);
			let col3: Core.Color = Core.ColorUtils.multiply(col, 0.1);

			this.areIdentical( col2, 0x808080, "col2" );
			this.areIdentical( col3, 0x1A1A1A, "col3" );
		}

		rgbColorMultiply() {
			let col: Core.Color = "rgb(255,255,255)";
			let col2: Core.Color = Core.ColorUtils.multiply(col, 0.5);
			let col3: Core.Color = Core.ColorUtils.multiply(col, 0.1);

			this.areIdentical( col2, 0x808080, "col2" );
			this.areIdentical( col3, 0x1A1A1A, "col3" );
		}

		stdColorMultiply() {
			let col: Core.Color = "white";
			let col2: Core.Color = Core.ColorUtils.multiply(col, 0.5);
			let col3: Core.Color = Core.ColorUtils.multiply(col, 0.1);

			this.areIdentical( col2, 0x808080, "col2" );
			this.areIdentical( col3, 0x1A1A1A, "col3" );
		}
	}
}